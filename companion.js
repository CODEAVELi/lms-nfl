/* Game-day helpers shared by the UI, workbook preview and regression tests. */
const WATCHLIST_KEY = "lmsNFL.watchlist.v1";

function readWatchlists() {
  try {
    const value = JSON.parse(localStorage.getItem(WATCHLIST_KEY) || "{}");
    if (!value || Array.isArray(value) || typeof value !== "object") return {};
    return Object.fromEntries(Object.entries(value).map(([key, teams]) => [key, Array.isArray(teams) ? [...new Set(teams.map(aliasForTeam).filter(Boolean))] : []]));
  } catch { return {}; }
}

function teamExposure(week, teamName) {
  const alias = aliasForTeam(teamName);
  const before = calculateWeek(week);
  const team = week.teams.find(t => aliasForTeam(t.team) === alias);
  const roster = week.totalsMode !== "teams" && week.entries.length > 0;
  const count = roster ? week.entries.filter(e => !e.preOutReason && [e.pick1,e.pick2,e.pick3].some(p => aliasForTeam(p) === alias)).length : nonnegativeCount(team?.count);
  // Aggregate counts cannot determine overlap in a multi-pick week.
  const exact = roster || week.requiredPicks === 1;
  const after = exact ? calculateWeek({...week, teams:week.teams.map(t => aliasForTeam(t.team) === alias ? {...t,result:RESULT.Lose} : t)}) : null;
  return { count, percent: before.grandTotal ? count / before.grandTotal * 100 : 0, exact,
    additionalOut: after ? Math.max(0, after.eliminated - before.eliminated) : null,
    remaining: after?.survivors ?? null };
}

function recapModel(week) {
  const sums = calculateWeek(week);
  const losses = week.teams.filter(t => normalizedResult(t.result) === RESULT.Lose)
    .map(t => ({team:t.team, count:teamExposure(week,t.team).count})).sort((a,b) => b.count-a.count);
  return { season:week.season, weekNumber:week.weekNumber, prize:week.season === 2026 ? "$390,000" : null,
    total:sums.grandTotal, remaining:sums.survivors, safe:sums.safe, pending:sums.pending, out:sums.eliminated,
    preOut:sums.preOutTotal, biggestLoss:losses[0] || null,
    provisional:!week.teams.length || sums.pending > 0 || sums.warnings.length > 0,
    updated:week.lastFetchedUtc, localDraft:Boolean(week.localDraft), manual:week.teams.some(t => t.manualOverride) };
}

function detectWorkbookSheets(sheets) {
  return sheets.flatMap(sheet => {
    const headerIndex = sheet.rows.slice(0,20).findIndex(row => row.some(cell => /^(name|entry names)$/i.test(String(cell).trim())));
    if (headerIndex < 0) return [];
    const header = sheet.rows[headerIndex].map(v => String(v).trim());
    const nameIndex = header.findIndex(v => /^(name|entry names)$/i.test(v));
    const weeks = new Map();
    header.forEach((value,index) => {
      const match = value.match(/^week\s+(\d+)(?:\s*[-–]\s*pick\s+(\d+))?\s*$/i);
      if (!match || Number(match[1]) < 1 || Number(match[1]) > 18) return;
      const weekNumber = Number(match[1]);
      if (!weeks.has(weekNumber)) weeks.set(weekNumber,[]);
      weeks.get(weekNumber).push({index, pick:Number(match[2] || 1)});
    });
    if (!weeks.size) return [];
    return [{...sheet, headerIndex, nameIndex, weeks:[...weeks].map(([number,columns]) => ({number,columns:columns.sort((a,b)=>a.pick-b.pick),
      populated:sheet.rows.slice(headerIndex+1).some(row => columns.some(c => String(row[c.index] || "").trim()))}))}];
  });
}

function workbookPreview(sheets, sheetName, weekNumber, season, skipBlank = false) {
  const sheet = detectWorkbookSheets(sheets).find(s => s.name === sheetName);
  if (!sheet) throw new Error("No entry-name and Week columns found on this sheet.");
  const selected = sheet.weeks.find(w => w.number === Number(weekNumber));
  if (!selected) throw new Error("This sheet has no columns for the selected week.");
  if (!Number.isInteger(Number(season)) || season < 1920 || season > 2200) throw new Error("Enter a valid season year.");
  const requiredPicks = Math.max(...selected.columns.map(c=>c.pick));
  if (requiredPicks > 3 || selected.columns.length !== requiredPicks || new Set(selected.columns.map(c=>c.pick)).size !== selected.columns.length) throw new Error("Missing, duplicate or unsupported pick columns.");
  const errors = [], warnings = [], entries = [], names = new Set();
  let blankRows = 0, skipped = 0;
  for (let index = sheet.headerIndex + 1; index < sheet.rows.length; index++) {
    const row = sheet.rows[index];
    const name = String(row[sheet.nameIndex] || "").trim();
    if (!name || /^(grand total|total)$/i.test(name)) continue;
    const cells = selected.columns.map(c => ({pick:c.pick,value:String(row[c.index] || "").trim()}));
    const blank = cells.every(c=>!c.value);
    if (blank) { blankRows++; if (skipBlank) { skipped++; continue; } }
    if (names.has(name)) errors.push(`Row ${index+1}: duplicate entry name.`);
    names.add(name);
    const entry = {name, pick1:"", pick2:"", pick3:"", preOutReason:""};
    const aliases = new Set();
    for (const cell of cells) {
      if (!cell.value) continue;
      if (/^(no pick|no pick\s*[-–]\s*out|late pick|late pick\s*[-–]\s*out|out|eliminated|disqualified)$/i.test(cell.value)) {
        entry.preOutReason = cell.value; continue;
      }
      const alias = aliasForTeam(cell.value);
      if (!alias) errors.push(`Row ${index+1}, pick ${cell.pick}: unknown team "${cell.value}".`);
      else if (aliases.has(alias)) errors.push(`Row ${index+1}: the same team appears twice.`);
      else aliases.add(alias);
      entry[`pick${cell.pick}`] = alias ? TEAM_DISPLAY[alias] : cell.value;
    }
    entries.push(normalizeEntry(entry));
  }
  if (!entries.length) errors.push("No entries remain with these import settings.");
  if (blankRows) warnings.push(`${fmt(blankRows)} rows have no picks for this week. ${skipBlank ? "They are excluded." : "They remain pending; they are not treated as eliminated."}`);
  const incomplete = entries.filter(e => !e.preOutReason && [e.pick1,e.pick2,e.pick3].filter(Boolean).length < requiredPicks).length;
  if (incomplete && !blankRows) warnings.push(`${fmt(incomplete)} entries have incomplete picks and will remain pending unless another pick loses.`);
  const teams = buildTeamsFromEntries(entries);
  const noPickCount = entries.filter(e=>e.preOutReason).length;
  const week = normalizeWeek({name:`Week ${weekNumber}`,season:Number(season),weekNumber:Number(weekNumber),seasonType:2,requiredPicks,
    entries, teams, declaredGrandTotal:entries.length, localDraft:true});
  let reconciliation = "No matching summary sheet";
  for (const summary of sheets.filter(s => s.name !== sheetName)) {
    const first = summary.rows.findIndex(row => row.some(cell => new RegExp(`^Week\\s+${weekNumber}$`,"i").test(String(cell).trim())) && row.some(cell=>/count/i.test(String(cell))));
    if (first < 0) continue;
    const header = summary.rows[first];
    const labelColumn = header.findIndex(cell => new RegExp(`^Week\\s+${weekNumber}$`,"i").test(String(cell).trim()));
    const countColumn = header.findIndex(cell=>/count/i.test(String(cell)));
    const actual = new Map(teams.map(t => [aliasForTeam(t.team), t.count]));
    let grandTotal = null, difference = false;
    const seen = new Set();
    for (const row of summary.rows.slice(first+1)) {
      const label = String(row[labelColumn] || "").trim();
      if (!label) continue;
      const count = Number(String(row[countColumn] ?? "").replaceAll(",",""));
      if (!Number.isSafeInteger(count) || count < 0) { difference = true; continue; }
      if (/^grand total$/i.test(label)) { grandTotal = count; continue; }
      const alias = aliasForTeam(label);
      const key = alias || (/^no pick$/i.test(label) ? "NO_PICK" : label);
      if (seen.has(key)) difference = true;
      seen.add(key);
      const expected = alias ? (actual.get(alias) || 0) : key === "NO_PICK" ? entries.filter(e=>/^no pick/i.test(e.preOutReason)).length : entries.filter(e=>e.preOutReason.toLowerCase()===label.toLowerCase()).length;
      if (expected !== count) difference = true;
    }
    if (teams.some(t => !seen.has(aliasForTeam(t.team)))) difference = true;
    if (grandTotal !== null && grandTotal !== (requiredPicks === 1 ? entries.length : teams.reduce((s,t)=>s+t.count,0)+noPickCount)) difference = true;
    reconciliation = difference ? "Summary mismatch" : "Summary matched";
    if (difference) errors.push("Roster counts do not match the summary sheet. Correct the workbook or import settings before applying.");
    break;
  }
  return {week, errors:[...new Set(errors)], warnings, blankRows, skipped, incomplete, noPickCount,
    reconciliation, pickCount:teams.reduce((n,t)=>n+t.count,0)};
}

function readWorkbookFile(file) {
  if (!file || !/\.xlsx$/i.test(file.name)) return Promise.reject(new Error("Choose an .xlsx workbook."));
  if (file.size > 10 * 1024 * 1024) return Promise.reject(new Error("Choose a workbook smaller than 10 MB."));
  return new Promise(async (resolve,reject) => {
    let worker, timer;
    const finish = (error,result) => {clearTimeout(timer); worker?.terminate(); error ? reject(error) : resolve(result);};
    try {
      worker = new Worker("workbook-worker.js");
      timer = setTimeout(()=>finish(new Error("Workbook reading timed out. Try a smaller workbook.")),20000);
      worker.onerror = () => finish(new Error("Unable to read this workbook. Check that it is an unencrypted .xlsx file."));
      worker.onmessage = e => finish(e.data.error ? new Error(e.data.error) : null,e.data.sheets);
      const buffer = await file.arrayBuffer();
      worker.postMessage(buffer,[buffer]);
    } catch(error) {finish(error);}
  });
}

async function createRecapImage(model) {
  if (document.fonts?.load) await Promise.all([document.fonts.load('40px "Press Start 2P"'),document.fonts.load('80px "VT323"')]);
  const canvas = document.createElement("canvas"); canvas.width = 1200; canvas.height = 960;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Image export is unavailable in this browser.");
  ctx.fillStyle="#080e18"; ctx.fillRect(0,0,1200,960);
  ctx.strokeStyle="#f8b800"; ctx.lineWidth=6; ctx.strokeRect(24,24,1152,912);
  ctx.textAlign="center";
  const line=(text,y,size,color="#f5f7ff",pixel=false)=>{ctx.fillStyle=color;ctx.font=`${pixel ? "" : "600 "}${size}px ${pixel?'"Press Start 2P", monospace':'Arial, sans-serif'}`;ctx.fillText(text,600,y,1080);};
  line("LAST MAN STANDING",96,30,"#f5f7ff",true);
  line(`${model.season} NFL · WEEK ${model.weekNumber} · ${model.provisional?"IN PROGRESS":"FINAL"}`,145,25,"#b8c4da");
  line(model.prize || `${model.season} SEASON`,264,model.prize?65:52,"#ffce40",true);
  line(model.prize?"CASH PRIZE":"SEASON RECAP",316,22,"#b8c4da");
  line(`${fmt(model.remaining)} REMAINING`,430,43,"#80e65b",true);
  line(`OF ${fmt(model.total)} ENTRIES AT WEEK LOCK`,476,23,"#b8c4da");
  [ ["SAFE",model.safe,"#80e65b"], ["PENDING",model.pending,"#ffce40"], ["OUT",model.out,"#ff788f"] ].forEach(([label,value,color],i)=>{
    const x=240+i*360;ctx.fillStyle="#17233a";ctx.fillRect(x-150,525,300,150);
    ctx.fillStyle="#d3dbea";ctx.font="600 23px Arial";ctx.fillText(label,x,566);
    ctx.fillStyle=color;ctx.font='76px "VT323", monospace';ctx.fillText(fmt(value),x,641);
  });
  line(model.biggestLoss?`BIGGEST LOSING PICK: ${model.biggestLoss.team.toUpperCase()}`:"NO LOSING TEAM PICKS YET",742,24);
  line(model.biggestLoss?`${fmt(model.biggestLoss.count)} entries picked this team`:`${fmt(model.preOut)} pre-eliminated · ${model.provisional ? "Results still pending" : "All picks resolved"}`,781,22,"#b8c4da");
  line(model.updated?`Scores as of ${formatPacific(model.updated,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit",timeZoneName:"short"})}`:"Scores have not been synced",837,20,"#b8c4da");
  line(`${model.localDraft?"LOCAL WORKING COPY · ":""}${model.manual?"MANUAL OVERRIDES · ":""}Remaining includes pending entries.`,871,18,"#b8c4da");
  line("codeaveli.github.io/lms-nfl",908,19,"#f8b800");
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("Could not create the recap image.")),"image/png"));
}
