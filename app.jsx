const { useState, useMemo, useEffect, useRef, useCallback } = React;

    // Team logo component:
    // - Attempts to load /assets/logos/ABBR.svg (preferred) and falls back to showing a pixel chip with the team abbreviation.
    // - To use logos: drop SVG files into /assets/logos (e.g., /assets/logos/KC.svg). PNGs also supported by changing extension.
    function TeamIcon({ teamName }) {
      const abbr = aliasForTeam(teamName) || "";
      const [loaded, setLoaded] = React.useState(false);
      const src = abbr ? `assets/logos/${abbr}.svg` : "";

      return (
        <span className="team-logo" aria-label={abbr || "team"}>
          {!loaded && <span className="team-chip">{abbr || "??"}</span>}
          {src && (
            <img
              src={src}
              alt=""
              aria-hidden="true"
              onLoad={() => setLoaded(true)}
              onError={() => setLoaded(false)}
              style={{ display: loaded ? "block" : "none" }}
            />
          )}
        </span>
      );
    }

    const ResultControl = ({ value, onChange, teamName }) => (
      <div className="flex items-center gap-2">
        <div className="hidden sm:inline-flex segmented-8bit">
          {[RESULT.Win, RESULT.Lose, RESULT.Push, RESULT.Pending].map((opt) => (
            <button
              key={opt}
              className={opt === value ? "active" : ""}
              onClick={() => onChange(opt)}
              title={opt === RESULT.Push ? "Push counts as a loss" : undefined}
            >
              {opt === RESULT.Push ? "Push" : opt}
            </button>
          ))}
        </div>
        <select
          aria-label={`Result override for ${teamName}`}
          className="sm:hidden select-8bit px-2 py-1 text-xs"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {[RESULT.Pending, RESULT.Win, RESULT.Lose, RESULT.Push].map((opt) => (
            <option key={opt} value={opt}>{opt === RESULT.Push ? "Push (Lose)" : opt}</option>
          ))}
        </select>
      </div>
    );

    function WorkbookImporter({season, onApply, onNotice}) {
      const [sheets,setSheets] = useState(null);
      const [sheetName,setSheetName] = useState("");
      const [number,setNumber] = useState(1);
      const [year,setYear] = useState(season);
      const [skipBlank,setSkipBlank] = useState(false);
      const [busy,setBusy] = useState(false);
      const [fileName,setFileName] = useState("");
      const [acknowledge,setAcknowledge] = useState(false);
      const inputRef = useRef(null);
      const fileRequest = useRef(0);
      useEffect(()=>()=>{fileRequest.current++;},[]);
      const detected = useMemo(()=>sheets ? detectWorkbookSheets(sheets) : [],[sheets]);
      const preview = useMemo(()=> {
        if (!sheets || !sheetName) return null;
        try {return workbookPreview(sheets,sheetName,number,Number(year),skipBlank);}
        catch(error) {return {errors:[error.message],warnings:[]};}
      },[sheets,sheetName,number,year,skipBlank]);
      useEffect(()=>setAcknowledge(false),[preview]);
      const readFile = async file => {
        const request = ++fileRequest.current;
        setBusy(true);setSheets(null);setFileName("");
        try {
          const next = await readWorkbookFile(file);
          if (request !== fileRequest.current) return;
          const candidates = detectWorkbookSheets(next);
          if (!candidates.length) throw new Error("No Name and Week columns found. Use the LMS workbook format.");
          const first = candidates.find(s=>s.weeks.some(w=>w.populated)) || candidates[0];
          const populated = first.weeks.filter(w=>w.populated);
          setSheets(next);setSheetName(first.name);setNumber((populated.length?populated:first.weeks).at(-1).number);
          setYear(season);setSkipBlank(false);setFileName(file.name);
        } catch(error) {if(request === fileRequest.current) onNotice({type:"error",text:error.message});}
        finally {if(request === fileRequest.current) setBusy(false);}
      };
      const selected = detected.find(s=>s.name===sheetName);
      return <section className="panel-8bit workspace-panel" aria-labelledby="workbook-heading">
        <h2 id="workbook-heading" className="pixel-font">Import weekly spreadsheet</h2>
        <p>Review the detected week, picks and exceptions before replacing that week’s local working copy. The file stays on this device.</p>
        <div className="drop-zone" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(!busy && e.dataTransfer.files[0])readFile(e.dataTransfer.files[0]);}}>
          <label htmlFor="workbook-file">{busy?"Reading workbook…":"Drop an .xlsx workbook here, or choose a file"}</label>
          <input ref={inputRef} id="workbook-file" type="file" accept=".xlsx" disabled={busy} onChange={e=>{if(e.target.files?.[0])readFile(e.target.files[0]);e.target.value="";}} />
        </div>
        {sheets && <>
          <p className="source-line">{fileName}</p>
          <div className="import-options">
            <label>Sheet<select value={sheetName} onChange={e=>{setSheetName(e.target.value);const next=detected.find(s=>s.name===e.target.value);setNumber((next.weeks.filter(w=>w.populated).at(-1)||next.weeks[0]).number);}}>{detected.map(s=><option key={s.name}>{s.name}</option>)}</select></label>
            <label>Import season<input type="number" min="1920" max="2200" value={year} onChange={e=>setYear(e.target.value)} /></label>
            <label>Import week<select value={number} onChange={e=>setNumber(Number(e.target.value))}>{selected?.weeks.map(w=><option key={w.number} value={w.number}>Week {w.number}{w.populated?"":" (blank)"}</option>)}</select></label>
          </div>
          <label className="check-row"><input type="checkbox" checked={skipBlank} onChange={e=>setSkipBlank(e.target.checked)} />Exclude rows with no picks in this week (for previously eliminated entries)</label>
          {preview?.week && <>
            <div className="import-totals"><span><strong>{fmt(preview.week.entries.length)}</strong> entries</span><span><strong>{fmt(preview.pickCount)}</strong> picks</span><span><strong>{preview.week.requiredPicks}</strong> per entry</span><span><strong>{preview.noPickCount}</strong> pre-out</span></div>
            <p className={preview.errors.length?"error-text":"success-text"}>{preview.reconciliation}</p>
            <div className="preview-table"><table><caption>Detected team totals</caption><thead><tr><th>Team</th><th>Picks</th></tr></thead><tbody>{preview.week.teams.map(t=><tr key={t.team}><td>{t.team}</td><td>{fmt(t.count)}</td></tr>)}</tbody></table></div>
            <details><summary>Review first 10 entries on this device</summary><div className="preview-table"><table><thead><tr><th>Entry</th><th>Picks / exception</th></tr></thead><tbody>{preview.week.entries.slice(0,10).map((e,i)=><tr key={i}><td>{e.name}</td><td>{e.preOutReason || [e.pick1,e.pick2,e.pick3].filter(Boolean).join(", ") || "Pending — no picks"}</td></tr>)}</tbody></table></div></details>
          </>}
          {preview?.warnings.map(w=><p key={w} className="warning-text">{w}</p>)}
          {preview?.errors.slice(0,8).map(e=><p key={e} role="alert" className="error-text">{e}</p>)}
          {preview?.errors.length>8 && <p className="error-text">{preview.errors.length-8} additional errors. Correct the workbook before applying.</p>}
          <label className="check-row"><input type="checkbox" checked={acknowledge} onChange={e=>setAcknowledge(e.target.checked)} />I reviewed the season, week and counts. Replace this week’s local working copy.</label>
          <button className="btn-8bit" disabled={busy || !preview?.week || preview.errors.length>0 || !acknowledge} onClick={()=>{onApply({...preview.week,source:fileName});setSheets(null);setFileName("");}}>Apply reviewed week</button>
        </>}
      </section>;
    }

    function RecapDialog({recap,onClose,onNotice}) {
      const dialogRef = useRef(null);
      useEffect(()=> {
        const previous = document.activeElement;
        dialogRef.current?.showModal();
        return ()=>{dialogRef.current?.close();previous?.focus?.();};
      },[]);
      const download = ()=>{
        const a=document.createElement("a");a.href=recap.url;a.download=recap.fileName;a.click();
      };
      const share = async()=>{
        try {
          const file = new File([recap.blob],recap.fileName,{type:"image/png"});
          if (navigator.canShare?.({files:[file]}) && navigator.share) await navigator.share({files:[file],title:`LMS ${recap.model.season} Week ${recap.model.weekNumber}`});
          else {download();onNotice({type:"info",text:"Recap downloaded. Attach the PNG to your group chat."});}
        } catch(error) {if(error.name!=="AbortError")onNotice({type:"error",text:"Sharing failed. Use Download PNG instead."});}
      };
      return <dialog className="recap-dialog" ref={dialogRef} onCancel={e=>{e.preventDefault();onClose();}} aria-labelledby="recap-title">
        <div className="section-heading"><h2 className="pixel-font" id="recap-title">Weekly recap</h2><button className="btn-8bit secondary" onClick={onClose} aria-label="Close recap">Close</button></div>
        <p>A snapshot of this week’s current results. Participant names are never included.</p>
        <img src={recap.url} alt={`Week ${recap.model.weekNumber}: ${fmt(recap.model.remaining)} remaining, ${fmt(recap.model.safe)} safe, ${fmt(recap.model.pending)} pending, ${fmt(recap.model.out)} out.`} />
        <div className="action-row"><button className="btn-8bit" onClick={download}>Download PNG</button><button className="btn-8bit secondary" onClick={share}>Share recap</button></div>
      </dialog>;
    }

    function GameCard({team,week,watched,onWatch,commissioner,onResult,exposure}) {
      const live = team.live;
      const status = team.result === RESULT.Win ? "Safe" : team.result === RESULT.Lose ? "Out" : "Pending";
      return <article className={`game-card ${watched?"watched":""} ${team._isLive?"game-live":""}`} aria-label={`${team.team} game`}>
        <div className="card-top"><span className={`status-tag status-${status.toLowerCase()}`}>{team._isLive?`Live · ${status}`:status}</span><button className="watch-button" aria-pressed={watched} aria-label={`${watched?"Unwatch":"Watch"} ${team.team}`} onClick={onWatch}>{watched?"Watching":"+ My Picks"}</button></div>
        <div className="matchup"><div className="team-heading"><TeamIcon teamName={team.team}/><h3>{team.team}</h3></div><strong className="game-score">{live && live.state!=="pre" && live.teamScore!==null && live.opponentScore!==null?`${live.teamScore} – ${live.opponentScore}`:"—"}</strong></div>
        <p className="opponent">{live?`${live.homeAway==="home"?"vs":"@"} ${live.opponent || live.opponentAbbr}`:"Matchup awaiting score sync"}</p>
        <p className="game-time">{live?.completed?"Final":live?.state === "pre" ? formatGameTime(live.kickoff) : live?.statusText || "Kickoff time unavailable"}{team.manualOverride?" · Manual result":""}</p>
        <div className="exposure-line"><strong>{fmt(exposure.count)} entries</strong><span>{exposure.percent.toFixed(1)}% of starting field</span></div>
        <div className="exposure-track" aria-hidden="true"><span style={{width:`${Math.min(100,exposure.percent)}%`}} /></div>
        {team.result === RESULT.Pending && <p className="loss-impact">{exposure.exact?`If they lose: ${fmt(exposure.additionalOut)} additional entries out.`:"Load the entry roster to calculate exact eliminations."}</p>}
        {commissioner && <div className="card-override"><span>Result override</span><ResultControl teamName={team.team} value={team.result} onChange={onResult}/><small>Pending returns control to ESPN on the next sync.</small></div>}
      </article>;
    }

    function App() {
      const [weeks, setWeeks] = useState(loadInitialWeeks);
      const [selectedIndex, setSelectedIndex] = useState(0);
      const [syncing, setSyncing] = useState(false);
      const [syncNotice, setSyncNotice] = useState(null);
      const noticeTimeoutRef = useRef(null);
      const [sortMode, setSortMode] = useState("picks");
      const [statusFilter, setStatusFilter] = useState("all");
      const [picksView, setPicksView] = useState("teams");
      const [rosterSearch, setRosterSearch] = useState("");
      const [rosterPage, setRosterPage] = useState(0);
      const [storageError, setStorageError] = useState(false);
      const stateRef = useRef(null);
      const requestRef = useRef(null);
      const [pasteText, setPasteText] = useState("");
      const [pastePreview, setPastePreview] = useState([]);
      const [pasteUnknowns, setPasteUnknowns] = useState([]);
      const [rosterText, setRosterText] = useState("");
      const [rosterPreview, setRosterPreview] = useState([]);
      const [rosterUnknowns, setRosterUnknowns] = useState([]);
      const [manageOpen, setManageOpen] = useState(false);
      const [commissioner, setCommissioner] = useState(false);
      const [watchlists,setWatchlists] = useState(readWatchlists);
      const [onlyWatched,setOnlyWatched] = useState(false);
      const [scenarioTeam,setScenarioTeam] = useState("");
      const [recap,setRecap] = useState(null);
      const [recapBusy,setRecapBusy] = useState(false);

      const [autoRefresh, setAutoRefresh] = useState(() => {
        if (typeof window === "undefined") return true;
        let stored;
        try { stored = localStorage.getItem(AUTO_REFRESH_KEY); } catch { return true; }
        if (stored === null) return true;
        return stored === "true";
      });

      const week = weeks[selectedIndex] || weeks[0] || DEFAULT_WEEKS[0];
      stateRef.current = { weeks, selectedIndex };
      const selectedKey = weekIdentityKey(week);
      const watched = watchlists[selectedKey] || [];
      useEffect(()=>{try { localStorage.setItem(WATCHLIST_KEY,JSON.stringify(watchlists)); } catch {setStorageError(true);}},[watchlists]);
      useEffect(()=>{setScenarioTeam("");setOnlyWatched(false);setStatusFilter("all");},[selectedKey]);
      useEffect(()=>()=>{if(recap) URL.revokeObjectURL(recap.url);},[recap]);
      const toggleWatch = team => {
        const alias = aliasForTeam(team);
        setWatchlists(prev=>{const current=prev[selectedKey] || [];return {...prev,[selectedKey]:current.includes(alias)?current.filter(a=>a!==alias):[...current,alias]};});
      };

      useEffect(() => {
        if (typeof window === "undefined") return;
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(weeks)); setStorageError(false); } catch { setStorageError(true); }
      }, [weeks]);

      useEffect(() => {
        if (typeof window === "undefined") return;
        try { localStorage.setItem(AUTO_REFRESH_KEY, autoRefresh ? "true" : "false"); } catch { setStorageError(true); }
      }, [autoRefresh]);

      useEffect(() => {
        if (selectedIndex > weeks.length - 1) {
          setSelectedIndex(Math.max(0, weeks.length - 1));
        }
      }, [weeks.length, selectedIndex]);

      useEffect(() => {
        setPastePreview([]);
        setPasteUnknowns([]);
        setRosterPreview([]);
        setRosterUnknowns([]);
        setPasteText(""); setRosterText(""); setRosterSearch(""); setRosterPage(0);
      }, [selectedIndex]);

      const clearNotice = useCallback(() => {
        if (noticeTimeoutRef.current) {
          clearTimeout(noticeTimeoutRef.current);
          noticeTimeoutRef.current = null;
        }
      }, []);

      const pushNotice = useCallback((notice) => {
        clearNotice();
        setSyncNotice(notice);
        if (notice && notice.persist !== true) {
          noticeTimeoutRef.current = setTimeout(() => setSyncNotice(null), 6000);
        }
      }, [clearNotice]);

      useEffect(() => () => clearNotice(), [clearNotice]);

      const fetchScores = useCallback(async ({ silent = false } = {}) => {
        const state = stateRef.current;
        const currentWeek = state.weeks[state.selectedIndex];
        if (!currentWeek?.teams.length) {
          if (!silent) pushNotice({ type: "info", text: "Add team picks before syncing scores." });
          return;
        }
        requestRef.current?.abort();
        const controller = new AbortController();
        requestRef.current = controller;
        const targetKey = weekIdentityKey(currentWeek);
        const timeout = setTimeout(() => controller.abort(), 20000);
        setSyncing(true);
        try {
          const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=${currentWeek.weekNumber}&seasontype=${currentWeek.seasonType}&dates=${currentWeek.season}`;
          const response = await fetch(url, { signal: controller.signal });
          if (!response.ok) throw new Error(`ESPN responded with status ${response.status}`);
          const data = await response.json();
          if (controller.signal.aborted) return;
          const updated = applyScoreboard(currentWeek, data);
          setWeeks(prev => prev.map(w => weekIdentityKey(w) === targetKey ? applyScoreboard(w, data) : w));
          if (!silent || updated.lastWarnings.length) pushNotice({
            type: updated.lastWarnings.length ? "warn" : "success",
            text: updated.lastWarnings.length ? `Scores synced; ${updated.lastWarnings.length} teams need review.` : `Synced ${currentWeek.season} Week ${currentWeek.weekNumber} scores.`,
            action: updated.lastWarnings.length ? "jump-to-warnings" : null,
          });
        } catch (error) {
          if (error.name !== "AbortError") pushNotice({ type: "error", text: `Live score sync failed: ${error.message}` });
          else if (requestRef.current === controller) pushNotice({ type: "warn", text: "Score request timed out. Try Sync scores again." });
        } finally {
          clearTimeout(timeout);
          if (requestRef.current === controller) { requestRef.current = null; setSyncing(false); }
        }
      }, [pushNotice]);

      useEffect(() => {
        if (autoRefresh) fetchScores({ silent: true });
        const id = autoRefresh ? setInterval(() => fetchScores({ silent: true }), AUTO_REFRESH_INTERVAL_MS) : null;
        return () => {
          if (id) clearInterval(id);
          const controller = requestRef.current; requestRef.current = null; controller?.abort();
          setSyncing(false);
        };
      }, [autoRefresh, selectedKey, fetchScores]);

      const sums = useMemo(() => calculateWeek(week), [week]);


      const rosterStats = useMemo(() => {
        const entries = week?.entries || [];
        let picks = 0;
        let hasSecondPick = false;
        entries.forEach((entry) => {
          if (entry.pick1) picks += 1;
          if (entry.pick3) picks += 1;
          if (entry.pick2) {
            picks += 1;
            hasSecondPick = true;
          }
        });
        return { entries: entries.length, picks, hasSecondPick: hasSecondPick || week.requiredPicks >= 2, hasThirdPick: week.requiredPicks >= 3 || entries.some(e => e.pick3) };
      }, [week]);

      const hasRoster = rosterStats.entries > 0 && week.totalsMode !== "teams";
      const rosterResults = useMemo(() => teamResultLookup(week.teams || []), [week.teams]);
      const filteredRoster = useMemo(() => (week.entries || []).filter(e => e.name.toLowerCase().includes(rosterSearch.toLowerCase().trim())), [week.entries, rosterSearch]);
      const pageCount = Math.max(1, Math.ceil(filteredRoster.length / 50));
      const currentPage = Math.min(rosterPage, pageCount - 1);
      const visibleRoster = filteredRoster.slice(currentPage * 50, currentPage * 50 + 50);

      useEffect(() => {
        if (!hasRoster && picksView === "roster") {
          setPicksView("teams");
        }
      }, [hasRoster, picksView]);

      const setTeamResult = (teamName, result) => {
        const nextResult = normalizedResult(result);
        setWeeks((prev) =>
          prev.map((w, i) =>
            i !== selectedIndex
              ? w
              : {
                  ...w,
                  localDraft: true,
                  teams: (w.teams || []).map((t) => (t.team === teamName ? { ...t, result: nextResult, manualOverride: nextResult !== RESULT.Pending } : t)),
                }
          )
        );
      };

      const addWeek = () => {
        try {
          const nextWeek = {...nextWeekDefinition(weeks, week),localDraft:true};
          setWeeks(prev => [...prev, nextWeek]);
          setSelectedIndex(weeks.length);
        } catch (error) { pushNotice({ type: "warn", text: error.message }); }
      };

      const changeSchedule = (field, value) => {
        if (!Number.isInteger(value) || value < 1 || (field === "season" && value < 1920) || (field === "seasonType" && value > 3) || (field === "weekNumber" && value > 18)) return;
        const next = { ...week, [field]: value };
        if (weeks.some((w,i) => i !== selectedIndex && weekIdentityKey(w) === weekIdentityKey(next))) {
          pushNotice({ type: "warn", text: "That season/week already exists. Select that week instead." }); return;
        }
        setWeeks(prev => prev.map((w,i) => i !== selectedIndex ? w : { ...w, localDraft: true, [field]: value, lastFetchedUtc: null, lastWarnings: [], lastSource: null, teams: w.teams.map(t => ({...t, result: RESULT.Pending, live: null, manualOverride: false})) }));
      };

      const previewPaste = () => {
        let parsed;
        try { parsed = parseTeamsText(pasteText); } catch (error) { setPastePreview([]); pushNotice({ type: "error", text: error.message }); return; }
        setPastePreview(parsed);
        const unknowns = parsed.filter((p) => p.team && !aliasForTeam(p.team)).map((p) => p.team);
        setPasteUnknowns(unknowns);
      };

      const previewRoster = () => {
        let parsed;
        try { parsed = parseRosterText(rosterText); } catch (error) { setRosterPreview([]); pushNotice({ type: "error", text: error.message }); return; }
        setRosterPreview(parsed);
        const unknowns = new Set();
        parsed.forEach((entry) => {
          [entry.pick1, entry.pick2, entry.pick3].forEach((pick) => {
            if (pick && !aliasForTeam(pick)) {
              unknowns.add(pick);
            }
          });
        });
        setRosterUnknowns(Array.from(unknowns));
      };

      const applyPastePreview = () => {
        if (!pastePreview.length || pasteUnknowns.length) return;
        if (hasRoster) { pushNotice({ type: "warn", text: "Update the roster to keep entry names and team totals in sync." }); return; }
        if (week.requiredPicks > 1) { pushNotice({ type: "warn", text: "Use a roster for multiple-pick weeks so entries are counted once." }); return; }
        setWeeks((prev) =>
          prev.map((w, i) =>
            i !== selectedIndex ? w : { ...w, localDraft: true, totalsMode: "teams", entries: [], source: null, declaredGrandTotal: pastePreview.reduce((n,t) => n + t.count, 0) + w.preOut.reduce((n,p) => n + p.count, 0), teams: pastePreview.map((p) => ({ ...p, result: RESULT.Pending, live: null })) }
          )
        );
        setPasteText("");
        setPastePreview([]);
        setPasteUnknowns([]);
        pushNotice({ type: "success", text: "Picks applied from paste preview." });
      };

      const applyRosterPreview = () => {
        if (!rosterPreview.length || rosterUnknowns.length) return;
        setWeeks((prev) =>
          prev.map((w, i) => {
            if (i !== selectedIndex) return w;
            const nextEntries = rosterPreview.map((entry) => ({ ...entry }));
            const nextTeams = buildTeamsFromEntries(nextEntries, w.teams);
            return normalizeWeek({ ...w, localDraft: true, source: null, totalsMode: "roster", entries: nextEntries, teams: nextTeams, declaredGrandTotal: nextEntries.length + w.preOut.reduce((n,p) => n + p.count, 0) });
          })
        );
        setRosterText("");
        setRosterPreview([]);
        setRosterUnknowns([]);
        setPicksView("roster");
        pushNotice({
          type: "success",
          text: "Roster applied and team totals updated.",
        });
      };

      const exportJSON = () => {
        const blob = new Blob([JSON.stringify(weeks, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "lms_weeks.json";
        a.click();
        URL.revokeObjectURL(url);
      };

      const importJSON = (file) => {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const parsed = JSON.parse(reader.result);
            const imported = validateImportedWeeks(parsed);
            if (imported.length) {
              const controller = requestRef.current; requestRef.current = null; controller?.abort();
              setSyncing(false);
              setWeeks(imported.map(w=>({...w,localDraft:true})));
              setSelectedIndex(0);
              pushNotice({ type: "success", text: "Weeks import complete." });
            }
          } catch (error) {
            pushNotice({ type: "error", text: `Import failed: ${error.message}` });
          }
        };
        reader.readAsText(file);
      };

      const tableTeams = useMemo(() => {
        const base = (week?.teams || []).map((t) => {
          const live = t.live;
          const isLive = live && !live.completed && live.state === "in";
          const isFinal = Boolean(live?.completed) || [RESULT.Win, RESULT.Lose, RESULT.Push].includes(t.result);
          const status = isLive ? "live" : isFinal ? "final" : "pending";
          const statusText = live
            ? live.statusText || (live.state === "pre" ? formatGameTime(live.kickoff) : "")
            : "";
          return { ...t, _status: status, _isLive: isLive, _isFinal: isFinal, _statusText: statusText };
        });
        let filtered = base;
        if (statusFilter !== "all") {
          filtered = base.filter((t) => t._status === statusFilter);
        }
        let sorted = filtered;
        if (sortMode === "picks") {
          sorted = [...filtered].sort(
            (a, b) => (Number(b.count || 0) - Number(a.count || 0)) || a.team.localeCompare(b.team)
          );
        } else if (sortMode === "alpha") {
          sorted = [...filtered].sort((a, b) => a.team.localeCompare(b.team));
        }
        return sorted;
      }, [week, sortMode, statusFilter]);

      const hasLiveGames = useMemo(() => {
        return (week?.teams || []).some((t) => t.live && t.live.state === "in" && !t.live.completed);
      }, [week]);

      const seasonTypeLabel = useMemo(() => {
        switch (week?.seasonType) {
          case 1: return "Preseason";
          case 3: return "Postseason";
          default: return "Regular";
        }
      }, [week?.seasonType]);

      const lastSyncShort = useMemo(() => {
        if (!week.lastFetchedUtc) return "Never";
        return formatPacific(week.lastFetchedUtc, {
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
          timeZoneName: "short",
        });
      }, [week.lastFetchedUtc]);

      const autoRefreshText = autoRefresh ? "Refreshing every 60s" : "Manual sync";

      const exposure = useMemo(()=>new Map(week.teams.map(t=>[t.team,teamExposure(week,t.team)])),[week]);
      const shownTeams = useMemo(()=>tableTeams.filter(t=>!onlyWatched || watched.includes(aliasForTeam(t.team))).sort((a,b)=>
        Number(watched.includes(aliasForTeam(b.team)))-Number(watched.includes(aliasForTeam(a.team))) || Number(b._isLive)-Number(a._isLive)),[tableTeams,onlyWatched,watched]);
      const scenario = scenarioTeam ? exposure.get(scenarioTeam) : null;
      const applyWorkbook = imported => {
        const key=weekIdentityKey(imported);
        const index=weeks.findIndex(w=>weekIdentityKey(w)===key);
        requestRef.current?.abort();requestRef.current=null;setSyncing(false);
        setWeeks(prev=>index<0?[...prev,imported]:prev.map(w=>weekIdentityKey(w)===key?imported:w));
        setSelectedIndex(index<0?weeks.length:index);
        pushNotice({type:"success",text:`${imported.season} Week ${imported.weekNumber}: ${fmt(imported.entries.length)} entries applied to this browser.`,persist:true});
      };
      const openRecap = async()=>{
        setRecapBusy(true);
        try {
          const model=recapModel(week);
          const blob=await createRecapImage(model);
          setRecap({model,blob,url:URL.createObjectURL(blob),fileName:`LMS-${model.season}-Week-${model.weekNumber}-recap.png`});
        } catch(error) {pushNotice({type:"error",text:error.message});}
        finally {setRecapBusy(false);}
      };

      return <div className="app-shell">
        <a className="skip-link" href="#main-content">Skip to games</a>
        <header className="app-header">
          <div><h1 className="pixel-font">LMS NFL</h1><p>Last Man Standing · {week.season}</p></div>
          <nav aria-label="Display mode" className="mode-switch"><button aria-pressed={!commissioner} onClick={()=>setCommissioner(false)}>Viewer</button><button aria-pressed={commissioner} onClick={()=>setCommissioner(true)}>Commissioner</button></nav>
        </header>
        {!commissioner && <section className="prize-board" aria-label="League scoreboard">
          <div className="board-topline"><span>{week.season} SEASON</span><span>WEEK {String(week.weekNumber).padStart(2,"0")}</span></div>
          <div className="board-prize"><h2 className="board-label">{week.season===2026?"CASH PRIZE":"SEASON ARCHIVE"}</h2><div className="pixel-font prize-digits">{week.season===2026?"$390,000":week.season}</div><p className="board-tagline">{fmt(sums.grandTotal)} entries at week lock</p></div>
        </section>}
        {commissioner && <section className="workspace-intro"><h2 className="pixel-font">Commissioner workspace</h2><p>Imports and edits stay in this browser. This is a local workspace, not an authenticated publishing console. Export a backup before making changes.</p></section>}
        <section className="status-strip" aria-label="Entry status summary" aria-describedby="status-definition">
          <div><span>Remaining</span><strong className="pixel-mono board-green">{fmt(sums.survivors)}</strong></div>
          <div><span>Safe</span><strong className="pixel-mono board-green">{fmt(sums.safe)}</strong></div>
          <div><span>Pending</span><strong className="pixel-mono gold">{fmt(sums.pending)}</strong></div>
          <div><span>Out</span><strong className="pixel-mono board-red">{fmt(sums.eliminated)}</strong></div>
        </section>
        <p id="status-definition" className="status-definition">Remaining includes safe and pending entries. Out includes pre-eliminated entries.</p>
        <div className="week-toolbar"><div className="week-controls"><label className="sr-only" htmlFor="season-select">Season</label><select id="season-select" aria-label="Season" value={week.season} onChange={e=>setSelectedIndex(weeks.findIndex(w=>w.season===Number(e.target.value)))}>{[...new Set(weeks.map(w=>w.season))].sort((a,b)=>b-a).map(year=><option key={year} value={year}>{year}{year<2026?" Archive":" Season"}</option>)}</select>
          <label className="sr-only" htmlFor="week-select">Week</label><select id="week-select" aria-label="Week" value={selectedIndex} onChange={e=>setSelectedIndex(Number(e.target.value))}>{weeks.map((w,i)=>w.season===week.season?<option key={i} value={i}>{w.name}</option>:null)}</select></div>
          <div className="action-row"><button className="btn-8bit warn" onClick={()=>fetchScores()} disabled={syncing}>{syncing?"Syncing…":"Sync scores"}</button><button className="btn-8bit secondary" onClick={openRecap} disabled={recapBusy || !sums.grandTotal || sums.warnings.length>0}>{recapBusy?"Creating recap…":"Weekly recap"}</button></div>
        </div>
        <div className="sync-status"><span>{hasLiveGames?"Games live · ":""}{lastSyncShort==="Never"?"Scores not synced yet":`Updated ${lastSyncShort}`}</span><label className="check-row"><input type="checkbox" checked={autoRefresh} onChange={e=>setAutoRefresh(e.target.checked)}/>Auto-refresh every 60s</label></div>
        {week.localDraft && <p className="local-copy">Local working copy · edits have not been published to the shared league site.</p>}
        {storageError && <p role="alert" className="warning-text">Browser storage is unavailable. Your watchlist and edits may not survive a reload.</p>}
        {sums.warnings.map(w=><p key={w} role="alert" className="warning-text">{w}</p>)}
        {syncNotice && <div role="status" className={`notice notice-${syncNotice.type}`}><span>{syncNotice.text}</span><button aria-label="Dismiss notice" onClick={()=>setSyncNotice(null)}>Dismiss</button></div>}
        {(week.lastWarnings || []).length>0 && <details id="warnings-panel" className="warning-text"><summary>{week.lastWarnings.length} teams need score review</summary>{week.lastWarnings.map(w=><p key={w}>{w}</p>)}</details>}
        <details className="week-details"><summary>Week details & counting rules</summary><p>{fmt(sums.grandTotal)} entries at lock. {fmt(sums.losers)} out from team losses and {fmt(sums.preOutTotal)} pre-eliminated. Remaining includes safe and pending entries. Ties count as losses. {week.requiredPicks} pick{week.requiredPicks===1?"":"s"} required per entry.</p>{week.source && <p>Source: {week.source}</p>}</details>
        {commissioner && <div className="commissioner-content"><WorkbookImporter season={week.season} onApply={applyWorkbook} onNotice={pushNotice}/>
            <div className="space-y-6">
              <div className="panel-8bit p-5 rounded-md">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="pixel-font text-sm uppercase">Advanced editing & backups</h3>
                  <button
                    aria-expanded={manageOpen}
                    onClick={() => setManageOpen((open) => !open)}
                    className="btn-8bit secondary px-3 py-1 text-xs"
                  >
                    {manageOpen ? "Hide" : "Show"}
                  </button>
                </div>
                {manageOpen && (
                <div className="mt-3 space-y-3 text-sm">
                  <label className="block">
                    <span className="helper-8bit">Rename current week</span>
                    <input
                      className="input-8bit mt-1 w-full px-3 py-2"
                      value={week.name}
                      onChange={(e) => {
                        const value = e.target.value;
                        setWeeks((prev) =>
                          prev.map((w, i) => (i === selectedIndex ? { ...w, localDraft: true, name: value } : w))
                        );
                      }}
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => addWeek()}
                      className="btn-8bit secondary px-3 py-2"
                    >
                      + New Week
                    </button>
                    <button
                      onClick={exportJSON}
                      className="btn-8bit secondary px-3 py-2"
                    >
                      Export JSON
                    </button>
                  </div>

                  <label className="block">
                    <span className="helper-8bit">Import JSON (export format)</span>
                    <input
                      type="file"
                      accept="application/json"
                      className="mt-1 w-full text-xs"
                      onChange={(e) => e.target.files?.[0] && importJSON(e.target.files[0])}
                    />
                  </label>

                  <label className="block">
                    <span className="helper-8bit">Paste teams (Team,Count per line)</span>
                    <textarea
                      className="textarea-8bit mt-1 w-full min-h-[120px] px-3 py-2"
                      placeholder={"Patriots,210\nChiefs,463"}
                      value={pasteText}
                      onChange={(e) => { setPasteText(e.target.value); setPastePreview([]); }}
                    ></textarea>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <button
                        onClick={previewPaste}
                        className="btn-8bit secondary px-3 py-2"
                        disabled={!pasteText.trim()}
                      >
                        Preview
                      </button>
                      <button
                        onClick={applyPastePreview}
                        className="btn-8bit px-3 py-2"
                        disabled={!pastePreview.length || pasteUnknowns.length > 0 || hasRoster || week.requiredPicks > 1}
                      >
                        Apply to Week
                      </button>
                      <span className="helper-8bit">Use the roster editor when entries are loaded. Team totals apply to single-pick weeks without a roster.</span>
                    </div>
                    {pastePreview.length > 0 && (
                      <div className="helper-8bit mt-2">
                        Preview loaded for {pastePreview.length} teams • {fmt(pastePreview.reduce((a, t) => a + (Number(t.count) || 0), 0))} picks
                      </div>
                    )}
                    {pasteUnknowns.length > 0 && (
                      <div className="text-xs text-[var(--tecmo-red)] mt-1">
                        Unknown teams: {pasteUnknowns.join(", ")}
                      </div>
                    )}
                  </label>

                  <label className="block">
                    <span className="helper-8bit">Paste roster (Name,Pick 1,Pick 2,Pick 3; optional picks)</span>
                    <textarea
                      className="textarea-8bit mt-1 w-full min-h-[120px] px-3 py-2"
                      placeholder={"Armen G 5,Texans,Bengals\nArmen Mac 50 30,Texans,Eagles"}
                      value={rosterText}
                      onChange={(e) => { setRosterText(e.target.value); setRosterPreview([]); }}
                    ></textarea>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <button
                        onClick={previewRoster}
                        className="btn-8bit secondary px-3 py-2"
                        disabled={!rosterText.trim()}
                      >
                        Preview
                      </button>
                      <button
                        onClick={applyRosterPreview}
                        className="btn-8bit px-3 py-2"
                        disabled={!rosterPreview.length || rosterUnknowns.length > 0}
                      >
                        Apply to Week
                      </button>
                      <span className="helper-8bit">Team totals update automatically.</span>
                    </div>
                    {rosterPreview.length > 0 && (
                      <div className="helper-8bit mt-2">
                        Preview loaded for {rosterPreview.length} entries -{" "}
                        {fmt(rosterPreview.reduce((a, entry) => a + (entry.pick1 ? 1 : 0) + (entry.pick2 ? 1 : 0) + (entry.pick3 ? 1 : 0), 0))}{" "}
                        picks
                      </div>
                    )}
                    {rosterUnknowns.length > 0 && (
                      <div className="text-xs text-[var(--tecmo-red)] mt-1">
                        Unknown teams: {rosterUnknowns.join(", ")}
                      </div>
                    )}
                  </label>

                  <label className="block">
                    <span className="helper-8bit">Grand Total (optional – defaults to entries + additional pre-out)</span>
                    <input
                      type="number"
                      className="input-8bit mt-1 w-full px-3 py-2"
                      value={week.declaredGrandTotal}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        setWeeks((prev) =>
                          prev.map((w, i) =>
                            i === selectedIndex ? { ...w, localDraft: true, declaredGrandTotal: nonnegativeCount(value) } : w
                          )
                        );
                      }}
                    />
                  </label>

                  <label className="block">
                    <span className="helper-8bit">Season (e.g. 2026)</span>
                    <input
                      type="number"
                      className="input-8bit mt-1 w-full px-3 py-2"
                      value={week.season}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        changeSchedule("season", value);
                      }}
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="helper-8bit">NFL Week #</span>
                      <input
                        type="number"
                        className="input-8bit mt-1 w-full px-3 py-2"
                        value={week.weekNumber}
                        onChange={(e) => {
                          const value = Number(e.target.value);
                          changeSchedule("weekNumber", value);
                        }}
                      />
                    </label>
                    <label className="block">
                      <span className="helper-8bit">Season Phase</span>
                      <select
                        className="select-8bit mt-1 w-full px-3 py-2"
                        value={week.seasonType}
                        onChange={(e) => {
                          const value = Number(e.target.value);
                          changeSchedule("seasonType", value);
                        }}
                      >
                        {SEASON_TYPES.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label className="block">
                    <span className="helper-8bit">Additional Pre-Out (outside the roster only; label:count)</span>
                    <textarea
                      className="textarea-8bit mt-1 w-full min-h-[80px] px-3 py-2"
                      key={selectedKey}
                      defaultValue={(week.preOut || []).map((p) => `${p.label}:${p.count}`).join("\n")}
                      onBlur={(e) => {
                        const preOut = e.target.value
                          .split(/\r?\n/)
                          .map((l) => l.trim())
                          .filter(Boolean)
                          .map((l) => {
                            const [label, countRaw] = l.split(":");
                            return {
                              label: (label || "Pre-Out").trim(),
                              count: nonnegativeCount(countRaw),
                            };
                          });
                        setWeeks((prev) =>
                          prev.map((w, i) => (i === selectedIndex ? { ...w, localDraft: true, preOut } : w))
                        );
                      }}
                    ></textarea>
                  </label>
                </div>
                )}
              </div>

              <div className="panel-8bit p-5 rounded-md">
                <h3 className="pixel-font text-sm uppercase">Quick How-To</h3>
                <ol className="mt-2 space-y-2 text-sm list-decimal list-inside">
                  <li>Pick a week above (add the next week when ready).</li>
                  <li>Paste your picks (Team,Count per line), preview, then apply.</li>
                  <li>For multi-pick weeks, paste Name and up to three picks. Each eliminated entry counts once.</li>
                  <li>Hit <span className="font-semibold">Sync scores</span> to pull ESPN results.</li>
                  <li>Manual overrides still work — ties count as losses when syncing.</li>
                  <li>Export/Import JSON for off-line backups between weeks.</li>
                </ol>
              </div>
            </div>
        </div>}
        <main id="main-content" tabIndex="-1">
          <section className="watchlist-panel" aria-labelledby="watchlist-heading"><div className="section-heading"><h2 id="watchlist-heading" className="pixel-font">My Picks</h2><button className="filter-button" aria-pressed={onlyWatched} onClick={()=>setOnlyWatched(!onlyWatched)}>{onlyWatched?"Show all teams":`Only my picks (${watched.length})`}</button></div>
            <p>{watched.length?"Your watched teams appear first. This list is saved on this device.":"Use + My Picks on a game to follow your teams here. This does not submit a league pick."}</p>
            {watched.length>0 && <div className="watch-chips">{watched.map(alias=><button key={alias} aria-label={`Remove ${TEAM_DISPLAY[alias]} from My Picks`} onClick={()=>toggleWatch(alias)}>{TEAM_DISPLAY[alias]} <span aria-hidden="true">×</span></button>)}</div>}
          </section>
          <div className="section-heading game-heading"><h2 className="pixel-font">Games · {week.name}</h2><label>Sort<select aria-label="Sort games" value={sortMode} onChange={e=>setSortMode(e.target.value)}><option value="picks">Most picked</option><option value="alpha">Team A–Z</option></select></label></div>
          <div className="game-filters" aria-label="Game status filters">{[{key:"all",label:"All"},{key:"pending",label:"Upcoming"},{key:"live",label:"Live"},{key:"final",label:"Final"}].map(f=><button key={f.key} aria-pressed={statusFilter===f.key} onClick={()=>setStatusFilter(f.key)}>{f.label}</button>)}</div>
          <div className="game-grid">{shownTeams.map(t=><GameCard key={t.team} team={t} week={week} watched={watched.includes(aliasForTeam(t.team))} onWatch={()=>toggleWatch(t.team)} commissioner={commissioner} onResult={value=>setTeamResult(t.team,value)} exposure={exposure.get(t.team)}/>)}</div>
          {!shownTeams.length && <div className="empty-state"><h3>No teams to show</h3><p>{onlyWatched?"Add teams to My Picks or show all teams.":"Try a different status filter. If this week has no picks yet, import them in Commissioner view."}</p><button className="btn-8bit secondary" onClick={()=>{setOnlyWatched(false);setStatusFilter("all");}}>Show all teams</button></div>}
          <details className="what-if panel-8bit"><summary>What if a team loses?</summary><p>This scenario changes only the selected pending team to a loss. Other results stay as they are; it is not a prediction.</p><label>Team to simulate<select value={scenarioTeam} onChange={e=>setScenarioTeam(e.target.value)}><option value="">Choose a pending team</option>{week.teams.filter(t=>t.result===RESULT.Pending).map(t=><option key={t.team}>{t.team}</option>)}</select></label>{scenario && (scenario.exact?<p className="scenario-result"><strong>{fmt(scenario.additionalOut)}</strong> additional entries out · <strong>{fmt(scenario.remaining)}</strong> remaining</p>:<p>Import the entry roster to calculate overlap in a multiple-pick week.</p>)}</details>
          {commissioner && hasRoster && <details className="roster-details"><summary>Entry roster on this device ({fmt(week.entries.length)})</summary><label>Search entries<input value={rosterSearch} onChange={e=>{setRosterSearch(e.target.value);setRosterPage(0);}} /></label><div className="preview-table"><table><thead><tr><th>Name</th><th>Picks</th><th>Status</th></tr></thead><tbody>{visibleRoster.map((e,i)=><tr key={i}><td>{e.name}</td><td>{[e.pick1,e.pick2,e.pick3].filter(Boolean).join(", ") || "—"}</td><td>{e.preOutReason || entryStatus(e,rosterResults,week.requiredPicks)}</td></tr>)}</tbody></table></div><div className="action-row"><button disabled={currentPage===0} onClick={()=>setRosterPage(currentPage-1)}>Previous</button><span>Page {currentPage+1} of {pageCount}</span><button disabled={currentPage>=pageCount-1} onClick={()=>setRosterPage(currentPage+1)}>Next</button></div></details>}
        </main>
        <footer>Built for your LMS pool · ESPN scores · Ties are losses</footer>
        {recap && <RecapDialog recap={recap} onClose={()=>setRecap(null)} onNotice={pushNotice}/>}
      </div>;
    }

    const root = ReactDOM.createRoot(document.getElementById("root"));
    root.render(<App />);
