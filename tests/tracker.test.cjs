const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');
function context(storage = {}) {
  const ctx = vm.createContext({ console: { log(){}, warn(){}, groupCollapsed(){}, groupEnd(){} }, window: {}, localStorage: { getItem: key => storage[key] || null } });
  vm.runInContext(fs.readFileSync(path.join(root,'data/week1-2026.js'),'utf8'),ctx);
  vm.runInContext(fs.readFileSync(path.join(root,'tracker.js'),'utf8'),ctx);
  return { run: code => vm.runInContext(code,ctx), ctx };
}
test('Week 1 matches all 4,827 workbook entries and all team summary counts', () => {
  const {run} = context();
  const sums = run('calculateWeek(DEFAULT_2026)');
  assert.equal(sums.grandTotal,4827); assert.equal(sums.picksTotal,4817);
  assert.equal(sums.preOutTotal,10); assert.equal(sums.eliminated,10);
  assert.equal(sums.survivors,4817); assert.equal(sums.pending,4817);
  assert.equal(sums.warnings.length,0);
  assert.equal(run('LMS_WEEK1_2026.entryCount'),4827);
  assert.equal(run('DEFAULT_2026.entries.length'),0);
  assert.equal(run('"entries" in LMS_WEEK1_2026'),false);
  assert.equal(run('DEFAULT_2026.teams.every(t => aliasForTeam(t.team))'),true);
});
test('2025 Week 11 is retained with the correct season, totals, and pre-outs', () => {
  const {run} = context(); const sums = run('calculateWeek(DEFAULT_WEEK11)');
  assert.equal(run('DEFAULT_WEEK11.season'),2025);
  assert.equal(sums.grandTotal,261); assert.equal(sums.preOutTotal,2);
  assert.equal(sums.survivors,259); assert.equal(sums.warnings.length,0);
});
test('2025 Week 16 counts entries once when both picks lose', () => {
  const {run} = context();
  const sums = run('calculateWeek({...DEFAULT_WEEK16, teams: DEFAULT_WEEK16.teams.map(t => ({...t,result:RESULT.Lose}))})');
  assert.equal(sums.picksTotal,72); assert.equal(sums.losers,36);
  assert.equal(sums.eliminated,36); assert.equal(sums.survivors,0); assert.equal(sums.pct,100);
});
test('one, two and three picks: a loss eliminates once, all wins survive, missing picks stay pending', () => {
  const {run} = context();
  run('var results = new Map([["KC",RESULT.Lose],["BUF",RESULT.Lose],["SF",RESULT.Win],["SEA",RESULT.Win],["LAC",RESULT.Win]])');
  assert.equal(run('entryStatus({pick1:"Chiefs",pick2:"Bills",pick3:"49ers"},results,3)'), 'Out');
  assert.equal(run('entryStatus({pick1:"49ers",pick2:"Seahawks",pick3:"Chargers"},results,3)'), 'Safe');
  assert.equal(run('entryStatus({pick1:"49ers",pick2:"Seahawks"},results,3)'), 'Pending');
  assert.equal(run('entryStatus({preOutReason:"No Pick"},results,1)'), 'Pre-Out');
  assert.equal(run('entryStatus({},results,1)'), 'Pending');
});
test('roster parser handles Excel headers, quoted names, three picks and explicit No Pick', () => {
  const {run} = context();
  const rows = run('parseRosterText(\'Name,Pick 1,Pick 2,Pick 3\\n"Doe, Jane",Chiefs,Bills,49ers\\nOther,No Pick\')');
  assert.equal(rows.length,2); assert.equal(rows[0].name,'Doe, Jane'); assert.equal(rows[0].pick3,'49ers');
  assert.equal(rows[1].preOutReason,'No Pick'); assert.equal(rows[1].pick1,'');
  assert.equal(run('parseRosterText("#\\tName\\tWeek 1\\n1\\tJane\\tChiefs")[0].name'),'Jane');
  assert.throws(() => run('parseRosterText("A,Chiefs\\nA,Bills")'), /Duplicate/);
});
test('team parser rejects negative, fractional, duplicate and malformed counts', () => {
  const {run} = context();
  for (const value of ['Chiefs,-1','Chiefs,1.2','Chiefs,no','Chiefs,','Chiefs,2\nKC,3']) assert.throws(() => run(`parseTeamsText(${JSON.stringify(value)})`));
  assert.equal(run('parseTeamsText("Team,Count\\nChiefs,2")[0].count'),2);
});
test('next week uses season/week numbers, including the later-season pick requirements', () => {
  const {run} = context();
  assert.equal(run('nextWeekDefinition(DEFAULT_WEEKS,DEFAULT_2026).weekNumber'),2);
  assert.equal(run('nextWeekDefinition(ARCHIVE_WEEKS,DEFAULT_WEEK11).weekNumber'),17);
  assert.equal(run('nextWeekDefinition([{season:2026,seasonType:2,weekNumber:13}],DEFAULT_2026).requiredPicks'),2);
  assert.equal(run('nextWeekDefinition([{season:2026,seasonType:2,weekNumber:16}],DEFAULT_2026).requiredPicks'),3);
  assert.throws(() => run('nextWeekDefinition([{season:2026,seasonType:2,weekNumber:18}],DEFAULT_2026)'), /Week 18/);
});
test('saved edits are retained and legacy built-in templates return to 2025', () => {
  const {run} = context();
  assert.equal(run('mergeStoredWeeksWithDefaults([{...DEFAULT_2026,name:"My edited week"}])[0].name'),'My edited week');
  assert.equal(run('migrateLegacyWeeks([{...DEFAULT_WEEK11,season:2026}])[0].season'),2025);
  assert.equal(run('migrateLegacyWeeks([{season:2026,weekNumber:7,teams:[],name:"Custom"}])[0].season'),2026);
});
test('JSON exports round trip while empty or malformed imports are rejected', () => {
  const {run} = context();
  assert.equal(run('validateImportedWeeks(JSON.parse(JSON.stringify(DEFAULT_WEEKS)))[0].declaredGrandTotal'),4827);
  assert.equal(run('validateImportedWeeks({weeks:DEFAULT_WEEKS}).length'),7);
  for(const value of ['[]','{}','[null]','[{teams:[]}]','[DEFAULT_2026,DEFAULT_2026]']) assert.throws(() => run(`validateImportedWeeks(${value})`));
});
function game(scoreA='21',scoreB='14', completed=true, abbr='JAC') {
  return {season:{year:2026,type:2},week:{number:1},events:[{id:'one',competitions:[{date:'2026-09-13T17:00:00Z',status:{type:{state:completed?'post':'pre',completed,shortDetail:completed?'Final':'Scheduled'}},competitors:[{id:'1',team:{abbreviation:abbr},score:scoreA},{id:'2',team:{abbreviation:'KC'},score:scoreB}]}]}]};
}
test('ESPN alternate Jaguars abbreviation, final wins, and ties map correctly', () => {
  const {run,ctx} = context(); ctx.data = game();
  assert.equal(run('applyScoreboard({...DEFAULT_2026,teams:[normalizeTeam({team:"Jaguars",count:1320})]},data).teams[0].result'),'Win');
  ctx.data = game('21','21');
  assert.equal(run('applyScoreboard({...DEFAULT_2026,teams:[normalizeTeam({team:"Jaguars",count:1320})]},data).teams[0].result'),'Lose');
  ctx.data = game('21','14',true,'WSH');
  assert.equal(run('applyScoreboard({...DEFAULT_2026,teams:[normalizeTeam({team:"Commanders",count:1})]},data).teams[0].result'),'Win');
});
test('manual result survives sync; missing scores and unfinished games do not become losses', () => {
  const {run,ctx} = context(); ctx.data = game();
  assert.equal(run('applyScoreboard({...DEFAULT_2026,teams:[normalizeTeam({team:"Jaguars",count:1,result:"Lose",manualOverride:true})]},data).teams[0].result'),'Lose');
  ctx.data = game('',null);
  assert.equal(run('applyScoreboard({...DEFAULT_2026,teams:[normalizeTeam({team:"Jaguars",count:1})]},data).teams[0].result'),'Pending');
  ctx.data = game('0','0',false);
  assert.equal(run('applyScoreboard({...DEFAULT_2026,teams:[normalizeTeam({team:"Jaguars",count:1})]},data).teams[0].result'),'Pending');
});
test('empty and mismatched ESPN responses cannot overwrite the selected week', () => {
  const {run,ctx} = context(); ctx.data = game(); ctx.data.season.year = 2025;
  assert.throws(() => run('applyScoreboard(DEFAULT_2026,data)'), /different season/);
  assert.throws(() => run('applyScoreboard(DEFAULT_2026,{events:[]})'), /no games/);
});
test('denied storage safely loads defaults', () => {
  const {run,ctx} = context(); ctx.localStorage.getItem = () => { throw new Error('denied'); };
  assert.equal(run('loadInitialWeeks()[0].season'),2026);
});
