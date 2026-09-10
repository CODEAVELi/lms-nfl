// Generated from app.jsx by scripts/build_app.cjs.
const {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback
} = React;
function TeamIcon({
  teamName
}) {
  const abbr = aliasForTeam(teamName) || "";
  const [loaded, setLoaded] = React.useState(false);
  const src = abbr ? `assets/logos/${abbr}.svg` : "";
  return React.createElement("span", {
    className: "team-logo",
    "aria-label": abbr || "team"
  }, !loaded && React.createElement("span", {
    className: "team-chip"
  }, abbr || "??"), src && React.createElement("img", {
    src: src,
    alt: "",
    "aria-hidden": "true",
    onLoad: () => setLoaded(true),
    onError: () => setLoaded(false),
    style: {
      display: loaded ? "block" : "none"
    }
  }));
}
const ResultControl = ({
  value,
  onChange,
  teamName
}) => React.createElement("div", {
  className: "flex items-center gap-2"
}, React.createElement("div", {
  className: "hidden sm:inline-flex segmented-8bit"
}, [RESULT.Win, RESULT.Lose, RESULT.Push, RESULT.Pending].map(opt => React.createElement("button", {
  key: opt,
  className: opt === value ? "active" : "",
  onClick: () => onChange(opt),
  title: opt === RESULT.Push ? "Push counts as a loss" : undefined
}, opt === RESULT.Push ? "Push" : opt))), React.createElement("select", {
  "aria-label": `Result override for ${teamName}`,
  className: "sm:hidden select-8bit px-2 py-1 text-xs",
  value: value,
  onChange: e => onChange(e.target.value)
}, [RESULT.Pending, RESULT.Win, RESULT.Lose, RESULT.Push].map(opt => React.createElement("option", {
  key: opt,
  value: opt
}, opt === RESULT.Push ? "Push (Lose)" : opt))));
function WorkbookImporter({
  season,
  onApply,
  onNotice
}) {
  const [sheets, setSheets] = useState(null);
  const [sheetName, setSheetName] = useState("");
  const [number, setNumber] = useState(1);
  const [year, setYear] = useState(season);
  const [skipBlank, setSkipBlank] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState("");
  const [acknowledge, setAcknowledge] = useState(false);
  const inputRef = useRef(null);
  const fileRequest = useRef(0);
  useEffect(() => () => {
    fileRequest.current++;
  }, []);
  const detected = useMemo(() => sheets ? detectWorkbookSheets(sheets) : [], [sheets]);
  const preview = useMemo(() => {
    if (!sheets || !sheetName) return null;
    try {
      return workbookPreview(sheets, sheetName, number, Number(year), skipBlank);
    } catch (error) {
      return {
        errors: [error.message],
        warnings: []
      };
    }
  }, [sheets, sheetName, number, year, skipBlank]);
  useEffect(() => setAcknowledge(false), [preview]);
  const readFile = async file => {
    const request = ++fileRequest.current;
    setBusy(true);
    setSheets(null);
    setFileName("");
    try {
      const next = await readWorkbookFile(file);
      if (request !== fileRequest.current) return;
      const candidates = detectWorkbookSheets(next);
      if (!candidates.length) throw new Error("No Name and Week columns found. Use the LMS workbook format.");
      const first = candidates.find(s => s.weeks.some(w => w.populated)) || candidates[0];
      const populated = first.weeks.filter(w => w.populated);
      setSheets(next);
      setSheetName(first.name);
      setNumber((populated.length ? populated : first.weeks).at(-1).number);
      setYear(season);
      setSkipBlank(false);
      setFileName(file.name);
    } catch (error) {
      if (request === fileRequest.current) onNotice({
        type: "error",
        text: error.message
      });
    } finally {
      if (request === fileRequest.current) setBusy(false);
    }
  };
  const selected = detected.find(s => s.name === sheetName);
  return React.createElement("section", {
    className: "panel-8bit workspace-panel",
    "aria-labelledby": "workbook-heading"
  }, React.createElement("h2", {
    id: "workbook-heading",
    className: "pixel-font"
  }, "Import weekly spreadsheet"), React.createElement("p", null, "Review the detected week, picks and exceptions before replacing that week’s local working copy. The file stays on this device."), React.createElement("div", {
    className: "drop-zone",
    onDragOver: e => e.preventDefault(),
    onDrop: e => {
      e.preventDefault();
      if (!busy && e.dataTransfer.files[0]) readFile(e.dataTransfer.files[0]);
    }
  }, React.createElement("label", {
    htmlFor: "workbook-file"
  }, busy ? "Reading workbook…" : "Drop an .xlsx workbook here, or choose a file"), React.createElement("input", {
    ref: inputRef,
    id: "workbook-file",
    type: "file",
    accept: ".xlsx",
    disabled: busy,
    onChange: e => {
      if (e.target.files?.[0]) readFile(e.target.files[0]);
      e.target.value = "";
    }
  })), sheets && React.createElement(React.Fragment, null, React.createElement("p", {
    className: "source-line"
  }, fileName), React.createElement("div", {
    className: "import-options"
  }, React.createElement("label", null, "Sheet", React.createElement("select", {
    value: sheetName,
    onChange: e => {
      setSheetName(e.target.value);
      const next = detected.find(s => s.name === e.target.value);
      setNumber((next.weeks.filter(w => w.populated).at(-1) || next.weeks[0]).number);
    }
  }, detected.map(s => React.createElement("option", {
    key: s.name
  }, s.name)))), React.createElement("label", null, "Import season", React.createElement("input", {
    type: "number",
    min: "1920",
    max: "2200",
    value: year,
    onChange: e => setYear(e.target.value)
  })), React.createElement("label", null, "Import week", React.createElement("select", {
    value: number,
    onChange: e => setNumber(Number(e.target.value))
  }, selected?.weeks.map(w => React.createElement("option", {
    key: w.number,
    value: w.number
  }, "Week ", w.number, w.populated ? "" : " (blank)"))))), React.createElement("label", {
    className: "check-row"
  }, React.createElement("input", {
    type: "checkbox",
    checked: skipBlank,
    onChange: e => setSkipBlank(e.target.checked)
  }), "Exclude rows with no picks in this week (for previously eliminated entries)"), preview?.week && React.createElement(React.Fragment, null, React.createElement("div", {
    className: "import-totals"
  }, React.createElement("span", null, React.createElement("strong", null, fmt(preview.week.entries.length)), " entries"), React.createElement("span", null, React.createElement("strong", null, fmt(preview.pickCount)), " picks"), React.createElement("span", null, React.createElement("strong", null, preview.week.requiredPicks), " per entry"), React.createElement("span", null, React.createElement("strong", null, preview.noPickCount), " pre-out")), React.createElement("p", {
    className: preview.errors.length ? "error-text" : "success-text"
  }, preview.reconciliation), React.createElement("div", {
    className: "preview-table"
  }, React.createElement("table", null, React.createElement("caption", null, "Detected team totals"), React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, "Team"), React.createElement("th", null, "Picks"))), React.createElement("tbody", null, preview.week.teams.map(t => React.createElement("tr", {
    key: t.team
  }, React.createElement("td", null, t.team), React.createElement("td", null, fmt(t.count))))))), React.createElement("details", null, React.createElement("summary", null, "Review first 10 entries on this device"), React.createElement("div", {
    className: "preview-table"
  }, React.createElement("table", null, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, "Entry"), React.createElement("th", null, "Picks / exception"))), React.createElement("tbody", null, preview.week.entries.slice(0, 10).map((e, i) => React.createElement("tr", {
    key: i
  }, React.createElement("td", null, e.name), React.createElement("td", null, e.preOutReason || [e.pick1, e.pick2, e.pick3].filter(Boolean).join(", ") || "Pending — no picks")))))))), preview?.warnings.map(w => React.createElement("p", {
    key: w,
    className: "warning-text"
  }, w)), preview?.errors.slice(0, 8).map(e => React.createElement("p", {
    key: e,
    role: "alert",
    className: "error-text"
  }, e)), preview?.errors.length > 8 && React.createElement("p", {
    className: "error-text"
  }, preview.errors.length - 8, " additional errors. Correct the workbook before applying."), React.createElement("label", {
    className: "check-row"
  }, React.createElement("input", {
    type: "checkbox",
    checked: acknowledge,
    onChange: e => setAcknowledge(e.target.checked)
  }), "I reviewed the season, week and counts. Replace this week’s local working copy."), React.createElement("button", {
    className: "btn-8bit",
    disabled: busy || !preview?.week || preview.errors.length > 0 || !acknowledge,
    onClick: () => {
      onApply({
        ...preview.week,
        source: fileName
      });
      setSheets(null);
      setFileName("");
    }
  }, "Apply reviewed week")));
}
function RecapDialog({
  recap,
  onClose,
  onNotice,
  returnFocus
}) {
  const dialogRef = useRef(null);
  useEffect(() => {
    const previous = returnFocus.current || document.activeElement;
    const dialog = dialogRef.current;
    dialogRef.current?.showModal();
    return () => {
      dialog?.close();
      previous?.focus?.();
    };
  }, []);
  const download = () => {
    const a = document.createElement("a");
    a.href = recap.url;
    a.download = recap.fileName;
    a.click();
  };
  const share = async () => {
    try {
      const file = new File([recap.blob], recap.fileName, {
        type: "image/png"
      });
      if (navigator.canShare?.({
        files: [file]
      }) && navigator.share) await navigator.share({
        files: [file],
        title: `LMS ${recap.model.season} Week ${recap.model.weekNumber}`
      });else {
        download();
        onNotice({
          type: "info",
          text: "Recap downloaded. Attach the PNG to your group chat."
        });
      }
    } catch (error) {
      if (error.name !== "AbortError") onNotice({
        type: "error",
        text: "Sharing failed. Use Download PNG instead."
      });
    }
  };
  return React.createElement("dialog", {
    className: "recap-dialog",
    ref: dialogRef,
    onCancel: e => {
      e.preventDefault();
      onClose();
    },
    "aria-labelledby": "recap-title"
  }, React.createElement("div", {
    className: "section-heading"
  }, React.createElement("h2", {
    className: "pixel-font",
    id: "recap-title"
  }, "Weekly recap"), React.createElement("button", {
    className: "btn-8bit secondary",
    onClick: onClose,
    "aria-label": "Close recap"
  }, "Close")), React.createElement("p", null, "A snapshot of this week’s current results. Participant names are never included."), React.createElement("img", {
    src: recap.url,
    alt: `Week ${recap.model.weekNumber}: ${fmt(recap.model.remaining)} remaining, ${fmt(recap.model.safe)} safe, ${fmt(recap.model.pending)} pending, ${fmt(recap.model.out)} out.`
  }), React.createElement("div", {
    className: "action-row"
  }, React.createElement("button", {
    className: "btn-8bit",
    onClick: download
  }, "Download PNG"), React.createElement("button", {
    className: "btn-8bit secondary",
    onClick: share
  }, "Share recap")));
}
function GameCard({
  team,
  week,
  watched,
  onWatch,
  commissioner,
  onResult,
  exposure
}) {
  const live = team.live;
  const status = team.result === RESULT.Win ? "Safe" : team.result === RESULT.Lose ? "Out" : "Pending";
  return React.createElement("article", {
    className: `game-card ${watched ? "watched" : ""} ${team._isLive ? "game-live" : ""}`,
    "aria-label": `${team.team} game`
  }, React.createElement("div", {
    className: "card-top"
  }, React.createElement("span", {
    className: `status-tag status-${status.toLowerCase()}`
  }, team._isLive ? `Live · ${status}` : status), React.createElement("button", {
    className: "watch-button",
    "aria-pressed": watched,
    "aria-label": `${watched ? "Unwatch" : "Watch"} ${team.team}`,
    onClick: onWatch
  }, watched ? "Watching" : "+ My Picks")), React.createElement("div", {
    className: "matchup"
  }, React.createElement("div", {
    className: "team-heading"
  }, React.createElement(TeamIcon, {
    teamName: team.team
  }), React.createElement("h3", null, team.team)), React.createElement("strong", {
    className: "game-score"
  }, live && live.state !== "pre" && live.teamScore !== null && live.opponentScore !== null ? `${live.teamScore} – ${live.opponentScore}` : "—")), React.createElement("p", {
    className: "opponent"
  }, live ? `${live.homeAway === "home" ? "vs" : "@"} ${live.opponent || live.opponentAbbr}` : "Matchup awaiting score sync"), React.createElement("p", {
    className: "game-time"
  }, live?.completed ? "Final" : live?.state === "pre" ? formatGameTime(live.kickoff) : live?.statusText || "Kickoff time unavailable", team.manualOverride ? " · Manual result" : ""), React.createElement("div", {
    className: "exposure-line"
  }, React.createElement("strong", null, fmt(exposure.count), " entries"), React.createElement("span", null, exposure.percent.toFixed(1), "% of starting field")), React.createElement("div", {
    className: "exposure-track",
    "aria-hidden": "true"
  }, React.createElement("span", {
    style: {
      width: `${Math.min(100, exposure.percent)}%`
    }
  })), team.result === RESULT.Pending && React.createElement("p", {
    className: "loss-impact"
  }, exposure.exact ? `If they lose: ${fmt(exposure.additionalOut)} additional entries out.` : "Load the entry roster to calculate exact eliminations."), commissioner && React.createElement("div", {
    className: "card-override"
  }, React.createElement("span", null, "Result override"), React.createElement(ResultControl, {
    teamName: team.team,
    value: team.result,
    onChange: onResult
  }), React.createElement("small", null, "Pending returns control to ESPN on the next sync.")));
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
  const [watchlists, setWatchlists] = useState(readWatchlists);
  const [onlyWatched, setOnlyWatched] = useState(false);
  const [scenarioTeam, setScenarioTeam] = useState("");
  const [recap, setRecap] = useState(null);
  const recapTrigger = useRef(null);
  const [recapBusy, setRecapBusy] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(() => {
    if (typeof window === "undefined") return true;
    let stored;
    try {
      stored = localStorage.getItem(AUTO_REFRESH_KEY);
    } catch {
      return true;
    }
    if (stored === null) return true;
    return stored === "true";
  });
  const week = weeks[selectedIndex] || weeks[0] || DEFAULT_WEEKS[0];
  stateRef.current = {
    weeks,
    selectedIndex
  };
  const selectedKey = weekIdentityKey(week);
  const watched = watchlists[selectedKey] || [];
  useEffect(() => {
    try {
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlists));
    } catch {
      setStorageError(true);
    }
  }, [watchlists]);
  useEffect(() => {
    setScenarioTeam("");
    setOnlyWatched(false);
    setStatusFilter("all");
  }, [selectedKey]);
  useEffect(() => () => {
    if (recap) URL.revokeObjectURL(recap.url);
  }, [recap]);
  const toggleWatch = team => {
    const alias = aliasForTeam(team);
    setWatchlists(prev => {
      const current = prev[selectedKey] || [];
      return {
        ...prev,
        [selectedKey]: current.includes(alias) ? current.filter(a => a !== alias) : [...current, alias]
      };
    });
  };
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(weeks));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [weeks]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(AUTO_REFRESH_KEY, autoRefresh ? "true" : "false");
    } catch {
      setStorageError(true);
    }
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
    setPasteText("");
    setRosterText("");
    setRosterSearch("");
    setRosterPage(0);
  }, [selectedIndex]);
  const clearNotice = useCallback(() => {
    if (noticeTimeoutRef.current) {
      clearTimeout(noticeTimeoutRef.current);
      noticeTimeoutRef.current = null;
    }
  }, []);
  const pushNotice = useCallback(notice => {
    clearNotice();
    setSyncNotice(notice);
    if (notice && notice.persist !== true) {
      noticeTimeoutRef.current = setTimeout(() => setSyncNotice(null), 6000);
    }
  }, [clearNotice]);
  useEffect(() => () => clearNotice(), [clearNotice]);
  const fetchScores = useCallback(async ({
    silent = false
  } = {}) => {
    const state = stateRef.current;
    const currentWeek = state.weeks[state.selectedIndex];
    if (!currentWeek?.teams.length) {
      if (!silent) pushNotice({
        type: "info",
        text: "Add team picks before syncing scores."
      });
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
      const response = await fetch(url, {
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`ESPN responded with status ${response.status}`);
      const data = await response.json();
      if (controller.signal.aborted) return;
      const updated = applyScoreboard(currentWeek, data);
      setWeeks(prev => prev.map(w => weekIdentityKey(w) === targetKey ? applyScoreboard(w, data) : w));
      if (!silent || updated.lastWarnings.length) pushNotice({
        type: updated.lastWarnings.length ? "warn" : "success",
        text: updated.lastWarnings.length ? `Scores synced; ${updated.lastWarnings.length} teams need review.` : `Synced ${currentWeek.season} Week ${currentWeek.weekNumber} scores.`,
        action: updated.lastWarnings.length ? "jump-to-warnings" : null
      });
    } catch (error) {
      if (error.name !== "AbortError") pushNotice({
        type: "error",
        text: `Live score sync failed: ${error.message}`
      });else if (requestRef.current === controller) pushNotice({
        type: "warn",
        text: "Score request timed out. Try Sync scores again."
      });
    } finally {
      clearTimeout(timeout);
      if (requestRef.current === controller) {
        requestRef.current = null;
        setSyncing(false);
      }
    }
  }, [pushNotice]);
  useEffect(() => {
    if (autoRefresh) fetchScores({
      silent: true
    });
    const id = autoRefresh ? setInterval(() => fetchScores({
      silent: true
    }), AUTO_REFRESH_INTERVAL_MS) : null;
    return () => {
      if (id) clearInterval(id);
      const controller = requestRef.current;
      requestRef.current = null;
      controller?.abort();
      setSyncing(false);
    };
  }, [autoRefresh, selectedKey, fetchScores]);
  const sums = useMemo(() => calculateWeek(week), [week]);
  const rosterStats = useMemo(() => {
    const entries = week?.entries || [];
    let picks = 0;
    let hasSecondPick = false;
    entries.forEach(entry => {
      if (entry.pick1) picks += 1;
      if (entry.pick3) picks += 1;
      if (entry.pick2) {
        picks += 1;
        hasSecondPick = true;
      }
    });
    return {
      entries: entries.length,
      picks,
      hasSecondPick: hasSecondPick || week.requiredPicks >= 2,
      hasThirdPick: week.requiredPicks >= 3 || entries.some(e => e.pick3)
    };
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
    setWeeks(prev => prev.map((w, i) => i !== selectedIndex ? w : {
      ...w,
      localDraft: true,
      teams: (w.teams || []).map(t => t.team === teamName ? {
        ...t,
        result: nextResult,
        manualOverride: nextResult !== RESULT.Pending
      } : t)
    }));
  };
  const addWeek = () => {
    try {
      const nextWeek = {
        ...nextWeekDefinition(weeks, week),
        localDraft: true
      };
      setWeeks(prev => [...prev, nextWeek]);
      setSelectedIndex(weeks.length);
    } catch (error) {
      pushNotice({
        type: "warn",
        text: error.message
      });
    }
  };
  const changeSchedule = (field, value) => {
    if (!Number.isInteger(value) || value < 1 || field === "season" && value < 1920 || field === "seasonType" && value > 3 || field === "weekNumber" && value > 18) return;
    const next = {
      ...week,
      [field]: value
    };
    if (weeks.some((w, i) => i !== selectedIndex && weekIdentityKey(w) === weekIdentityKey(next))) {
      pushNotice({
        type: "warn",
        text: "That season/week already exists. Select that week instead."
      });
      return;
    }
    setWeeks(prev => prev.map((w, i) => i !== selectedIndex ? w : {
      ...w,
      localDraft: true,
      [field]: value,
      lastFetchedUtc: null,
      lastWarnings: [],
      lastSource: null,
      teams: w.teams.map(t => ({
        ...t,
        result: RESULT.Pending,
        live: null,
        manualOverride: false
      }))
    }));
  };
  const previewPaste = () => {
    let parsed;
    try {
      parsed = parseTeamsText(pasteText);
    } catch (error) {
      setPastePreview([]);
      pushNotice({
        type: "error",
        text: error.message
      });
      return;
    }
    setPastePreview(parsed);
    const unknowns = parsed.filter(p => p.team && !aliasForTeam(p.team)).map(p => p.team);
    setPasteUnknowns(unknowns);
  };
  const previewRoster = () => {
    let parsed;
    try {
      parsed = parseRosterText(rosterText);
    } catch (error) {
      setRosterPreview([]);
      pushNotice({
        type: "error",
        text: error.message
      });
      return;
    }
    setRosterPreview(parsed);
    const unknowns = new Set();
    parsed.forEach(entry => {
      [entry.pick1, entry.pick2, entry.pick3].forEach(pick => {
        if (pick && !aliasForTeam(pick)) {
          unknowns.add(pick);
        }
      });
    });
    setRosterUnknowns(Array.from(unknowns));
  };
  const applyPastePreview = () => {
    if (!pastePreview.length || pasteUnknowns.length) return;
    if (hasRoster) {
      pushNotice({
        type: "warn",
        text: "Update the roster to keep entry names and team totals in sync."
      });
      return;
    }
    if (week.requiredPicks > 1) {
      pushNotice({
        type: "warn",
        text: "Use a roster for multiple-pick weeks so entries are counted once."
      });
      return;
    }
    setWeeks(prev => prev.map((w, i) => i !== selectedIndex ? w : {
      ...w,
      localDraft: true,
      totalsMode: "teams",
      entries: [],
      source: null,
      declaredGrandTotal: pastePreview.reduce((n, t) => n + t.count, 0) + w.preOut.reduce((n, p) => n + p.count, 0),
      teams: pastePreview.map(p => ({
        ...p,
        result: RESULT.Pending,
        live: null
      }))
    }));
    setPasteText("");
    setPastePreview([]);
    setPasteUnknowns([]);
    pushNotice({
      type: "success",
      text: "Picks applied from paste preview."
    });
  };
  const applyRosterPreview = () => {
    if (!rosterPreview.length || rosterUnknowns.length) return;
    setWeeks(prev => prev.map((w, i) => {
      if (i !== selectedIndex) return w;
      const nextEntries = rosterPreview.map(entry => ({
        ...entry
      }));
      const nextTeams = buildTeamsFromEntries(nextEntries, w.teams);
      return normalizeWeek({
        ...w,
        localDraft: true,
        source: null,
        totalsMode: "roster",
        entries: nextEntries,
        teams: nextTeams,
        declaredGrandTotal: nextEntries.length + w.preOut.reduce((n, p) => n + p.count, 0)
      });
    }));
    setRosterText("");
    setRosterPreview([]);
    setRosterUnknowns([]);
    setPicksView("roster");
    pushNotice({
      type: "success",
      text: "Roster applied and team totals updated."
    });
  };
  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(weeks, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lms_weeks.json";
    a.click();
    URL.revokeObjectURL(url);
  };
  const importJSON = file => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const imported = validateImportedWeeks(parsed);
        if (imported.length) {
          const controller = requestRef.current;
          requestRef.current = null;
          controller?.abort();
          setSyncing(false);
          setWeeks(imported.map(w => ({
            ...w,
            localDraft: true
          })));
          setSelectedIndex(0);
          pushNotice({
            type: "success",
            text: "Weeks import complete."
          });
        }
      } catch (error) {
        pushNotice({
          type: "error",
          text: `Import failed: ${error.message}`
        });
      }
    };
    reader.readAsText(file);
  };
  const tableTeams = useMemo(() => {
    const base = (week?.teams || []).map(t => {
      const live = t.live;
      const isLive = live && !live.completed && live.state === "in";
      const isFinal = Boolean(live?.completed) || [RESULT.Win, RESULT.Lose, RESULT.Push].includes(t.result);
      const status = isLive ? "live" : isFinal ? "final" : "pending";
      const statusText = live ? live.statusText || (live.state === "pre" ? formatGameTime(live.kickoff) : "") : "";
      return {
        ...t,
        _status: status,
        _isLive: isLive,
        _isFinal: isFinal,
        _statusText: statusText
      };
    });
    let filtered = base;
    if (statusFilter !== "all") {
      filtered = base.filter(t => t._status === statusFilter);
    }
    let sorted = filtered;
    if (sortMode === "picks") {
      sorted = [...filtered].sort((a, b) => Number(b.count || 0) - Number(a.count || 0) || a.team.localeCompare(b.team));
    } else if (sortMode === "alpha") {
      sorted = [...filtered].sort((a, b) => a.team.localeCompare(b.team));
    }
    return sorted;
  }, [week, sortMode, statusFilter]);
  const hasLiveGames = useMemo(() => {
    return (week?.teams || []).some(t => t.live && t.live.state === "in" && !t.live.completed);
  }, [week]);
  const seasonTypeLabel = useMemo(() => {
    switch (week?.seasonType) {
      case 1:
        return "Preseason";
      case 3:
        return "Postseason";
      default:
        return "Regular";
    }
  }, [week?.seasonType]);
  const lastSyncShort = useMemo(() => {
    if (!week.lastFetchedUtc) return "Never";
    return formatPacific(week.lastFetchedUtc, {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      timeZoneName: "short"
    });
  }, [week.lastFetchedUtc]);
  const autoRefreshText = autoRefresh ? "Refreshing every 60s" : "Manual sync";
  const exposure = useMemo(() => new Map(week.teams.map(t => [t.team, teamExposure(week, t.team)])), [week]);
  const shownTeams = useMemo(() => tableTeams.filter(t => !onlyWatched || watched.includes(aliasForTeam(t.team))).sort((a, b) => Number(watched.includes(aliasForTeam(b.team))) - Number(watched.includes(aliasForTeam(a.team))) || Number(b._isLive) - Number(a._isLive)), [tableTeams, onlyWatched, watched]);
  const scenario = scenarioTeam ? exposure.get(scenarioTeam) : null;
  const applyWorkbook = imported => {
    const key = weekIdentityKey(imported);
    const index = weeks.findIndex(w => weekIdentityKey(w) === key);
    requestRef.current?.abort();
    requestRef.current = null;
    setSyncing(false);
    setWeeks(prev => index < 0 ? [...prev, imported] : prev.map(w => weekIdentityKey(w) === key ? imported : w));
    setSelectedIndex(index < 0 ? weeks.length : index);
    pushNotice({
      type: "success",
      text: `${imported.season} Week ${imported.weekNumber}: ${fmt(imported.entries.length)} entries applied to this browser.`,
      persist: true
    });
  };
  const openRecap = async () => {
    setRecapBusy(true);
    try {
      const model = recapModel(week);
      const blob = await createRecapImage(model);
      setRecap({
        model,
        blob,
        url: URL.createObjectURL(blob),
        fileName: `LMS-${model.season}-Week-${model.weekNumber}-recap.png`
      });
    } catch (error) {
      pushNotice({
        type: "error",
        text: error.message
      });
    } finally {
      setRecapBusy(false);
    }
  };
  return React.createElement("div", {
    className: "app-shell"
  }, React.createElement("a", {
    className: "skip-link",
    href: "#main-content"
  }, "Skip to games"), React.createElement("header", {
    className: "app-header"
  }, React.createElement("div", null, React.createElement("h1", {
    className: "pixel-font"
  }, "LMS NFL"), React.createElement("p", null, "Last Man Standing · ", week.season)), React.createElement("nav", {
    "aria-label": "Display mode",
    className: "mode-switch"
  }, React.createElement("button", {
    "aria-pressed": !commissioner,
    onClick: () => setCommissioner(false)
  }, "Viewer"), React.createElement("button", {
    "aria-pressed": commissioner,
    onClick: () => setCommissioner(true)
  }, "Commissioner"))), !commissioner && React.createElement("section", {
    className: "prize-board",
    "aria-label": "League scoreboard"
  }, React.createElement("div", {
    className: "board-topline"
  }, React.createElement("span", null, week.season, " SEASON"), React.createElement("span", null, "WEEK ", String(week.weekNumber).padStart(2, "0"))), React.createElement("div", {
    className: "board-prize"
  }, React.createElement("h2", {
    className: "board-label"
  }, week.season === 2026 ? "CASH PRIZE" : "SEASON ARCHIVE"), React.createElement("div", {
    className: "pixel-font prize-digits"
  }, week.season === 2026 ? "$390,000" : week.season), React.createElement("p", {
    className: "board-tagline"
  }, fmt(sums.grandTotal), " entries at week lock"))), commissioner && React.createElement("section", {
    className: "workspace-intro"
  }, React.createElement("h2", {
    className: "pixel-font"
  }, "Commissioner workspace"), React.createElement("p", null, "Imports and edits stay in this browser. This is a local workspace, not an authenticated publishing console. Export a backup before making changes.")), React.createElement("section", {
    className: "status-strip",
    "aria-label": "Entry status summary",
    "aria-describedby": "status-definition"
  }, React.createElement("div", null, React.createElement("span", null, "Remaining"), React.createElement("strong", {
    className: "pixel-mono board-green"
  }, fmt(sums.survivors))), React.createElement("div", null, React.createElement("span", null, "Safe"), React.createElement("strong", {
    className: "pixel-mono board-green"
  }, fmt(sums.safe))), React.createElement("div", null, React.createElement("span", null, "Pending"), React.createElement("strong", {
    className: "pixel-mono gold"
  }, fmt(sums.pending))), React.createElement("div", null, React.createElement("span", null, "Out"), React.createElement("strong", {
    className: "pixel-mono board-red"
  }, fmt(sums.eliminated)))), React.createElement("p", {
    id: "status-definition",
    className: "status-definition"
  }, "Remaining includes safe and pending entries. Out includes pre-eliminated entries."), React.createElement("div", {
    className: "week-toolbar"
  }, React.createElement("div", {
    className: "week-controls"
  }, React.createElement("label", {
    className: "sr-only",
    htmlFor: "season-select"
  }, "Season"), React.createElement("select", {
    id: "season-select",
    "aria-label": "Season",
    value: week.season,
    onChange: e => setSelectedIndex(weeks.findIndex(w => w.season === Number(e.target.value)))
  }, [...new Set(weeks.map(w => w.season))].sort((a, b) => b - a).map(year => React.createElement("option", {
    key: year,
    value: year
  }, year, year < 2026 ? " Archive" : " Season"))), React.createElement("label", {
    className: "sr-only",
    htmlFor: "week-select"
  }, "Week"), React.createElement("select", {
    id: "week-select",
    "aria-label": "Week",
    value: selectedIndex,
    onChange: e => setSelectedIndex(Number(e.target.value))
  }, weeks.map((w, i) => w.season === week.season ? React.createElement("option", {
    key: i,
    value: i
  }, w.name) : null))), React.createElement("div", {
    className: "action-row"
  }, React.createElement("button", {
    className: "btn-8bit warn",
    onClick: () => fetchScores(),
    disabled: syncing
  }, syncing ? "Syncing…" : "Sync scores"), React.createElement("button", {
    className: "btn-8bit secondary",
    ref: recapTrigger,
    onClick: openRecap,
    disabled: recapBusy || !sums.grandTotal || sums.warnings.length > 0
  }, recapBusy ? "Creating recap…" : "Weekly recap"))), React.createElement("div", {
    className: "sync-status"
  }, React.createElement("span", null, hasLiveGames ? "Games live · " : "", lastSyncShort === "Never" ? "Scores not synced yet" : `Updated ${lastSyncShort}`), React.createElement("label", {
    className: "check-row"
  }, React.createElement("input", {
    type: "checkbox",
    checked: autoRefresh,
    onChange: e => setAutoRefresh(e.target.checked)
  }), "Auto-refresh every 60s")), week.localDraft && React.createElement("p", {
    className: "local-copy"
  }, "Local working copy · edits have not been published to the shared league site."), storageError && React.createElement("p", {
    role: "alert",
    className: "warning-text"
  }, "Browser storage is unavailable. Your watchlist and edits may not survive a reload."), sums.warnings.map(w => React.createElement("p", {
    key: w,
    role: "alert",
    className: "warning-text"
  }, w)), syncNotice && React.createElement("div", {
    role: "status",
    className: `notice notice-${syncNotice.type}`
  }, React.createElement("span", null, syncNotice.text), React.createElement("button", {
    "aria-label": "Dismiss notice",
    onClick: () => setSyncNotice(null)
  }, "Dismiss")), (week.lastWarnings || []).length > 0 && React.createElement("details", {
    id: "warnings-panel",
    className: "warning-text"
  }, React.createElement("summary", null, week.lastWarnings.length, " teams need score review"), week.lastWarnings.map(w => React.createElement("p", {
    key: w
  }, w))), React.createElement("details", {
    className: "week-details"
  }, React.createElement("summary", null, "Week details & counting rules"), React.createElement("p", null, fmt(sums.grandTotal), " entries at lock. ", fmt(sums.losers), " out from team losses and ", fmt(sums.preOutTotal), " pre-eliminated. Remaining includes safe and pending entries. Ties count as losses. ", week.requiredPicks, " pick", week.requiredPicks === 1 ? "" : "s", " required per entry."), week.source && React.createElement("p", null, "Source: ", week.source)), commissioner && React.createElement("div", {
    className: "commissioner-content"
  }, React.createElement(WorkbookImporter, {
    season: week.season,
    onApply: applyWorkbook,
    onNotice: pushNotice
  }), React.createElement("div", {
    className: "space-y-6"
  }, React.createElement("div", {
    className: "panel-8bit p-5 rounded-md"
  }, React.createElement("div", {
    className: "flex items-center justify-between gap-3"
  }, React.createElement("h3", {
    className: "pixel-font text-sm uppercase"
  }, "Advanced editing & backups"), React.createElement("button", {
    "aria-expanded": manageOpen,
    onClick: () => setManageOpen(open => !open),
    className: "btn-8bit secondary px-3 py-1 text-xs"
  }, manageOpen ? "Hide" : "Show")), manageOpen && React.createElement("div", {
    className: "mt-3 space-y-3 text-sm"
  }, React.createElement("label", {
    className: "block"
  }, React.createElement("span", {
    className: "helper-8bit"
  }, "Rename current week"), React.createElement("input", {
    className: "input-8bit mt-1 w-full px-3 py-2",
    value: week.name,
    onChange: e => {
      const value = e.target.value;
      setWeeks(prev => prev.map((w, i) => i === selectedIndex ? {
        ...w,
        localDraft: true,
        name: value
      } : w));
    }
  })), React.createElement("div", {
    className: "grid grid-cols-2 gap-2"
  }, React.createElement("button", {
    onClick: () => addWeek(),
    className: "btn-8bit secondary px-3 py-2"
  }, "+ New Week"), React.createElement("button", {
    onClick: exportJSON,
    className: "btn-8bit secondary px-3 py-2"
  }, "Export JSON")), React.createElement("label", {
    className: "block"
  }, React.createElement("span", {
    className: "helper-8bit"
  }, "Import JSON (export format)"), React.createElement("input", {
    type: "file",
    accept: "application/json",
    className: "mt-1 w-full text-xs",
    onChange: e => e.target.files?.[0] && importJSON(e.target.files[0])
  })), React.createElement("label", {
    className: "block"
  }, React.createElement("span", {
    className: "helper-8bit"
  }, "Paste teams (Team,Count per line)"), React.createElement("textarea", {
    className: "textarea-8bit mt-1 w-full min-h-[120px] px-3 py-2",
    placeholder: "Patriots,210\nChiefs,463",
    value: pasteText,
    onChange: e => {
      setPasteText(e.target.value);
      setPastePreview([]);
    }
  }), React.createElement("div", {
    className: "flex flex-wrap gap-2 mt-2"
  }, React.createElement("button", {
    onClick: previewPaste,
    className: "btn-8bit secondary px-3 py-2",
    disabled: !pasteText.trim()
  }, "Preview"), React.createElement("button", {
    onClick: applyPastePreview,
    className: "btn-8bit px-3 py-2",
    disabled: !pastePreview.length || pasteUnknowns.length > 0 || hasRoster || week.requiredPicks > 1
  }, "Apply to Week"), React.createElement("span", {
    className: "helper-8bit"
  }, "Use the roster editor when entries are loaded. Team totals apply to single-pick weeks without a roster.")), pastePreview.length > 0 && React.createElement("div", {
    className: "helper-8bit mt-2"
  }, "Preview loaded for ", pastePreview.length, " teams • ", fmt(pastePreview.reduce((a, t) => a + (Number(t.count) || 0), 0)), " picks"), pasteUnknowns.length > 0 && React.createElement("div", {
    className: "text-xs text-[var(--tecmo-red)] mt-1"
  }, "Unknown teams: ", pasteUnknowns.join(", "))), React.createElement("label", {
    className: "block"
  }, React.createElement("span", {
    className: "helper-8bit"
  }, "Paste roster (Name,Pick 1,Pick 2,Pick 3; optional picks)"), React.createElement("textarea", {
    className: "textarea-8bit mt-1 w-full min-h-[120px] px-3 py-2",
    placeholder: "Armen G 5,Texans,Bengals\nArmen Mac 50 30,Texans,Eagles",
    value: rosterText,
    onChange: e => {
      setRosterText(e.target.value);
      setRosterPreview([]);
    }
  }), React.createElement("div", {
    className: "flex flex-wrap items-center gap-2 mt-2"
  }, React.createElement("button", {
    onClick: previewRoster,
    className: "btn-8bit secondary px-3 py-2",
    disabled: !rosterText.trim()
  }, "Preview"), React.createElement("button", {
    onClick: applyRosterPreview,
    className: "btn-8bit px-3 py-2",
    disabled: !rosterPreview.length || rosterUnknowns.length > 0
  }, "Apply to Week"), React.createElement("span", {
    className: "helper-8bit"
  }, "Team totals update automatically.")), rosterPreview.length > 0 && React.createElement("div", {
    className: "helper-8bit mt-2"
  }, "Preview loaded for ", rosterPreview.length, " entries -", " ", fmt(rosterPreview.reduce((a, entry) => a + (entry.pick1 ? 1 : 0) + (entry.pick2 ? 1 : 0) + (entry.pick3 ? 1 : 0), 0)), " ", "picks"), rosterUnknowns.length > 0 && React.createElement("div", {
    className: "text-xs text-[var(--tecmo-red)] mt-1"
  }, "Unknown teams: ", rosterUnknowns.join(", "))), React.createElement("label", {
    className: "block"
  }, React.createElement("span", {
    className: "helper-8bit"
  }, "Grand Total (optional – defaults to entries + additional pre-out)"), React.createElement("input", {
    type: "number",
    className: "input-8bit mt-1 w-full px-3 py-2",
    value: week.declaredGrandTotal,
    onChange: e => {
      const value = Number(e.target.value);
      setWeeks(prev => prev.map((w, i) => i === selectedIndex ? {
        ...w,
        localDraft: true,
        declaredGrandTotal: nonnegativeCount(value)
      } : w));
    }
  })), React.createElement("label", {
    className: "block"
  }, React.createElement("span", {
    className: "helper-8bit"
  }, "Season (e.g. 2026)"), React.createElement("input", {
    type: "number",
    className: "input-8bit mt-1 w-full px-3 py-2",
    value: week.season,
    onChange: e => {
      const value = Number(e.target.value);
      changeSchedule("season", value);
    }
  })), React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, React.createElement("label", {
    className: "block"
  }, React.createElement("span", {
    className: "helper-8bit"
  }, "NFL Week #"), React.createElement("input", {
    type: "number",
    className: "input-8bit mt-1 w-full px-3 py-2",
    value: week.weekNumber,
    onChange: e => {
      const value = Number(e.target.value);
      changeSchedule("weekNumber", value);
    }
  })), React.createElement("label", {
    className: "block"
  }, React.createElement("span", {
    className: "helper-8bit"
  }, "Season Phase"), React.createElement("select", {
    className: "select-8bit mt-1 w-full px-3 py-2",
    value: week.seasonType,
    onChange: e => {
      const value = Number(e.target.value);
      changeSchedule("seasonType", value);
    }
  }, SEASON_TYPES.map(opt => React.createElement("option", {
    key: opt.value,
    value: opt.value
  }, opt.label))))), React.createElement("label", {
    className: "block"
  }, React.createElement("span", {
    className: "helper-8bit"
  }, "Additional Pre-Out (outside the roster only; label:count)"), React.createElement("textarea", {
    className: "textarea-8bit mt-1 w-full min-h-[80px] px-3 py-2",
    key: selectedKey,
    defaultValue: (week.preOut || []).map(p => `${p.label}:${p.count}`).join("\n"),
    onBlur: e => {
      const preOut = e.target.value.split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => {
        const [label, countRaw] = l.split(":");
        return {
          label: (label || "Pre-Out").trim(),
          count: nonnegativeCount(countRaw)
        };
      });
      setWeeks(prev => prev.map((w, i) => i === selectedIndex ? {
        ...w,
        localDraft: true,
        preOut
      } : w));
    }
  })))), React.createElement("div", {
    className: "panel-8bit p-5 rounded-md"
  }, React.createElement("h3", {
    className: "pixel-font text-sm uppercase"
  }, "Quick How-To"), React.createElement("ol", {
    className: "mt-2 space-y-2 text-sm list-decimal list-inside"
  }, React.createElement("li", null, "Pick a week above (add the next week when ready)."), React.createElement("li", null, "Paste your picks (Team,Count per line), preview, then apply."), React.createElement("li", null, "For multi-pick weeks, paste Name and up to three picks. Each eliminated entry counts once."), React.createElement("li", null, "Hit ", React.createElement("span", {
    className: "font-semibold"
  }, "Sync scores"), " to pull ESPN results."), React.createElement("li", null, "Manual overrides still work — ties count as losses when syncing."), React.createElement("li", null, "Export/Import JSON for off-line backups between weeks."))))), React.createElement("main", {
    id: "main-content",
    tabIndex: "-1"
  }, React.createElement("section", {
    className: "watchlist-panel",
    "aria-labelledby": "watchlist-heading"
  }, React.createElement("div", {
    className: "section-heading"
  }, React.createElement("h2", {
    id: "watchlist-heading",
    className: "pixel-font"
  }, "My Picks"), React.createElement("button", {
    className: "filter-button",
    "aria-pressed": onlyWatched,
    onClick: () => setOnlyWatched(!onlyWatched)
  }, onlyWatched ? "Show all teams" : `Only my picks (${watched.length})`)), React.createElement("p", null, watched.length ? "Your watched teams appear first. This list is saved on this device." : "Use + My Picks on a game to follow your teams here. This does not submit a league pick."), watched.length > 0 && React.createElement("div", {
    className: "watch-chips"
  }, watched.map(alias => React.createElement("button", {
    key: alias,
    "aria-label": `Remove ${TEAM_DISPLAY[alias]} from My Picks`,
    onClick: () => toggleWatch(alias)
  }, TEAM_DISPLAY[alias], " ", React.createElement("span", {
    "aria-hidden": "true"
  }, "×"))))), React.createElement("div", {
    className: "section-heading game-heading"
  }, React.createElement("h2", {
    className: "pixel-font"
  }, "Games · ", week.name), React.createElement("label", null, "Sort", React.createElement("select", {
    "aria-label": "Sort games",
    value: sortMode,
    onChange: e => setSortMode(e.target.value)
  }, React.createElement("option", {
    value: "picks"
  }, "Most picked"), React.createElement("option", {
    value: "alpha"
  }, "Team A–Z")))), React.createElement("div", {
    className: "game-filters",
    "aria-label": "Game status filters"
  }, [{
    key: "all",
    label: "All"
  }, {
    key: "pending",
    label: "Upcoming"
  }, {
    key: "live",
    label: "Live"
  }, {
    key: "final",
    label: "Final"
  }].map(f => React.createElement("button", {
    key: f.key,
    "aria-pressed": statusFilter === f.key,
    onClick: () => setStatusFilter(f.key)
  }, f.label))), React.createElement("div", {
    className: "game-grid"
  }, shownTeams.map(t => React.createElement(GameCard, {
    key: t.team,
    team: t,
    week: week,
    watched: watched.includes(aliasForTeam(t.team)),
    onWatch: () => toggleWatch(t.team),
    commissioner: commissioner,
    onResult: value => setTeamResult(t.team, value),
    exposure: exposure.get(t.team)
  }))), !shownTeams.length && React.createElement("div", {
    className: "empty-state"
  }, React.createElement("h3", null, "No teams to show"), React.createElement("p", null, onlyWatched ? "Add teams to My Picks or show all teams." : "Try a different status filter. If this week has no picks yet, import them in Commissioner view."), React.createElement("button", {
    className: "btn-8bit secondary",
    onClick: () => {
      setOnlyWatched(false);
      setStatusFilter("all");
    }
  }, "Show all teams")), React.createElement("details", {
    className: "what-if panel-8bit"
  }, React.createElement("summary", null, "What if a team loses?"), React.createElement("p", null, "This scenario changes only the selected pending team to a loss. Other results stay as they are; it is not a prediction."), React.createElement("label", null, "Team to simulate", React.createElement("select", {
    value: scenarioTeam,
    onChange: e => setScenarioTeam(e.target.value)
  }, React.createElement("option", {
    value: ""
  }, "Choose a pending team"), week.teams.filter(t => t.result === RESULT.Pending).map(t => React.createElement("option", {
    key: t.team
  }, t.team)))), scenario && (scenario.exact ? React.createElement("p", {
    className: "scenario-result"
  }, React.createElement("strong", null, fmt(scenario.additionalOut)), " additional entries out · ", React.createElement("strong", null, fmt(scenario.remaining)), " remaining") : React.createElement("p", null, "Import the entry roster to calculate overlap in a multiple-pick week."))), commissioner && hasRoster && React.createElement("details", {
    className: "roster-details"
  }, React.createElement("summary", null, "Entry roster on this device (", fmt(week.entries.length), ")"), React.createElement("label", null, "Search entries", React.createElement("input", {
    value: rosterSearch,
    onChange: e => {
      setRosterSearch(e.target.value);
      setRosterPage(0);
    }
  })), React.createElement("div", {
    className: "preview-table"
  }, React.createElement("table", null, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, "Name"), React.createElement("th", null, "Picks"), React.createElement("th", null, "Status"))), React.createElement("tbody", null, visibleRoster.map((e, i) => React.createElement("tr", {
    key: i
  }, React.createElement("td", null, e.name), React.createElement("td", null, [e.pick1, e.pick2, e.pick3].filter(Boolean).join(", ") || "—"), React.createElement("td", null, e.preOutReason || entryStatus(e, rosterResults, week.requiredPicks))))))), React.createElement("div", {
    className: "action-row"
  }, React.createElement("button", {
    disabled: currentPage === 0,
    onClick: () => setRosterPage(currentPage - 1)
  }, "Previous"), React.createElement("span", null, "Page ", currentPage + 1, " of ", pageCount), React.createElement("button", {
    disabled: currentPage >= pageCount - 1,
    onClick: () => setRosterPage(currentPage + 1)
  }, "Next")))), React.createElement("footer", null, "Built for your LMS pool · ESPN scores · Ties are losses"), recap && React.createElement(RecapDialog, {
    returnFocus: recapTrigger,
    recap: recap,
    onClose: () => setRecap(null),
    onNotice: pushNotice
  }));
}
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(React.createElement(App, null));
