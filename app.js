// Generated from app.jsx by scripts/build_app.cjs.
const {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback
} = React;
function useAnimatedNumber(value, duration = 600) {
  const [display, setDisplay] = useState(value);
  useEffect(() => {
    const from = display,
      to = value,
      start = performance.now();
    let raf;
    const tick = now => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return display;
}
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
const StatCard = ({
  title,
  value,
  sub
}) => React.createElement("div", {
  className: "panel-8bit p-4"
}, React.createElement("div", {
  className: "pixel-font text-[10px] text-tecmo-white/80 uppercase"
}, title), React.createElement("div", {
  className: "mt-2 pixel-mono text-2xl"
}, fmt(value)), sub !== undefined && React.createElement("div", {
  className: "mt-1 helper-8bit"
}, sub));
const Pill = ({
  active,
  children,
  onClick
}) => React.createElement("button", {
  onClick: onClick,
  className: `pill-8bit ${active ? "active" : ""}`
}, children);
const ResultBadge = ({
  result
}) => {
  const map = {
    [RESULT.Pending]: "badge-pending",
    [RESULT.Win]: "badge-win",
    [RESULT.Lose]: "badge-lose",
    [RESULT.Push]: "badge-push"
  };
  return React.createElement("span", {
    className: `badge-8bit ${map[result]}`
  }, result);
};
const ResultControl = ({
  value,
  onChange
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
  className: "sm:hidden select-8bit px-2 py-1 text-xs",
  value: value,
  onChange: e => onChange(e.target.value)
}, [RESULT.Pending, RESULT.Win, RESULT.Lose, RESULT.Push].map(opt => React.createElement("option", {
  key: opt,
  value: opt
}, opt === RESULT.Push ? "Push (Lose)" : opt))));
const LiveStatus = ({
  live
}) => {
  if (!live) return null;
  const isLive = !live.completed && live.state === "in";
  if (!isLive) return null;
  return React.createElement("span", {
    className: "live-badge"
  }, React.createElement("span", {
    className: "w-2 h-2 rounded-full bg-[var(--tecmo-gold)] animate-pulse"
  }), React.createElement("span", null, "Live"), React.createElement("span", {
    className: "pixel-mono text-[11px]"
  }, live.statusText || "In progress"));
};
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
  const [manageOpen, setManageOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth >= 768;
  });
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
  const jumpToWarnings = useCallback(() => {
    if (typeof document === "undefined") return;
    const el = document.getElementById("warnings-panel");
    if (el) {
      el.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    }
  }, []);
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
        text: "Score request timed out. Try Sync Live Scores again."
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
  const animElim = useAnimatedNumber(sums.eliminated);
  const animSurv = useAnimatedNumber(sums.survivors);
  const teamLookup = useMemo(() => {
    const map = new Map();
    (week?.teams || []).forEach(team => {
      const alias = aliasForTeam(team.team);
      if (alias && !map.has(alias)) {
        map.set(alias, team);
        return;
      }
      const key = (team.team || "").toUpperCase();
      if (key && !map.has(key)) {
        map.set(key, team);
      }
    });
    return map;
  }, [week]);
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
      teams: (w.teams || []).map(t => t.team === teamName ? {
        ...t,
        result: nextResult,
        manualOverride: nextResult !== RESULT.Pending
      } : t)
    }));
  };
  const addWeek = () => {
    try {
      const nextWeek = nextWeekDefinition(weeks, week);
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
        text: "That season/week already exists. Select its tab instead."
      });
      return;
    }
    setWeeks(prev => prev.map((w, i) => i !== selectedIndex ? w : {
      ...w,
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
          setWeeks(imported);
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
  const renderScore = team => {
    const live = team.live;
    if (!live) return "—";
    if (!Number.isFinite(live.teamScore) || !Number.isFinite(live.opponentScore)) return "—";
    return `${live.teamScore} – ${live.opponentScore}`;
  };
  const renderGameLine = team => {
    const live = team.live;
    if (!live) return team._status === "final" ? "Final (manual)" : "No live data";
    const vsAt = live.homeAway === "home" ? "vs" : "@";
    const opponent = live.opponent || live.opponentAbbr || "TBD";
    const statusText = live.completed ? "Final" : live.statusText || (live.state === "pre" ? formatGameTime(live.kickoff) : "In progress");
    return React.createElement("div", null, React.createElement("div", {
      className: "font-medium"
    }, `${vsAt} ${opponent}`), React.createElement("div", {
      className: "text-[11px] text-tecmo-white/70"
    }, statusText));
  };
  const renderRosterPick = pickName => {
    const label = (pickName || "").trim();
    if (!label) {
      return React.createElement("span", {
        className: "text-tecmo-white/40"
      }, "-");
    }
    const alias = aliasForTeam(label);
    const teamInfo = alias ? teamLookup.get(alias) : teamLookup.get(label.toUpperCase());
    const unknown = Boolean(label) && !alias;
    return React.createElement("div", {
      className: "flex items-center justify-between gap-2"
    }, React.createElement("div", {
      className: "flex items-center gap-2"
    }, React.createElement(TeamIcon, {
      teamName: label
    }), React.createElement("span", {
      className: unknown ? "text-[var(--tecmo-red)]" : ""
    }, label)), teamInfo ? React.createElement(ResultBadge, {
      result: teamInfo.result
    }) : unknown ? React.createElement("span", {
      className: "helper-8bit text-[var(--tecmo-red)]"
    }, "Unknown") : null);
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
  return React.createElement("div", {
    className: "mx-auto max-w-7xl px-4 sm:px-6 py-6"
  }, React.createElement("section", {
    className: "prize-board mb-6",
    "aria-label": "League scoreboard"
  }, React.createElement("div", {
    className: "board-topline pixel-font"
  }, React.createElement("span", null, "LMS / NFL"), React.createElement("span", null, week.season, " SEASON"), React.createElement("span", null, "WEEK ", String(week.weekNumber).padStart(2, "0"))), React.createElement("div", {
    className: "board-prize"
  }, React.createElement("p", {
    className: "pixel-font board-label"
  }, week.season === 2026 ? "CASH PRIZE" : "SEASON ARCHIVE"), React.createElement("div", {
    className: "pixel-font prize-digits"
  }, week.season === 2026 ? "$390,000" : String(week.season)), React.createElement("p", {
    className: "pixel-font board-tagline"
  }, "LAST MAN STANDING")), React.createElement("div", {
    className: "board-counters"
  }, React.createElement("div", null, React.createElement("span", {
    className: "pixel-font"
  }, "ENTRIES"), React.createElement("strong", {
    className: "pixel-mono"
  }, fmt(sums.grandTotal))), React.createElement("div", null, React.createElement("span", {
    className: "pixel-font"
  }, "REMAINING"), React.createElement("strong", {
    className: "pixel-mono board-green"
  }, fmt(animSurv))), React.createElement("div", null, React.createElement("span", {
    className: "pixel-font"
  }, "ELIMINATED"), React.createElement("strong", {
    className: "pixel-mono board-red"
  }, fmt(animElim)))), React.createElement("div", {
    className: "board-footer pixel-mono"
  }, React.createElement("span", null, hasLiveGames ? "● GAMES LIVE" : "● LEAGUE TRACKER"), React.createElement("span", null, autoRefresh ? "AUTO SYNC / 60 SEC" : "MANUAL SYNC"))), React.createElement("div", {
    className: "sticky-sync -mx-4 sm:-mx-6 px-4 sm:px-6 py-3"
  }, React.createElement("div", {
    className: "flex flex-wrap items-center gap-3 justify-between"
  }, React.createElement("div", {
    className: "flex items-center gap-2"
  }, React.createElement("button", {
    onClick: () => fetchScores(),
    disabled: syncing,
    className: "btn-8bit warn inline-flex items-center gap-2 px-3 py-2 text-sm disabled:opacity-60"
  }, syncing ? "Syncing…" : "Sync Live Scores"), React.createElement("span", {
    className: "chip"
  }, React.createElement("span", {
    className: "w-2 h-2 rounded-full bg-[var(--tecmo-gold)]"
  }), autoRefreshText)), React.createElement("div", {
    className: "chip text-xs"
  }, lastSyncShort === "Never" ? "Waiting for first sync" : `Last sync: ${lastSyncShort}`))), React.createElement("div", {
    className: "flex flex-col md:flex-row md:items-end md:justify-between gap-4"
  }, React.createElement("div", null, React.createElement("h1", {
    className: "pixel-font text-tecmo-gold text-xl md:text-2xl"
  }, "Last Man Standing – NFL"), React.createElement("p", {
    className: "helper-8bit mt-1"
  }, "Live elimination tracker with one-click ESPN score sync.")), React.createElement("div", {
    className: "flex flex-wrap gap-2"
  }, React.createElement("select", {
    "aria-label": "Season",
    className: "select-8bit px-3 py-2",
    value: week.season,
    onChange: e => setSelectedIndex(weeks.findIndex(w => w.season === Number(e.target.value)))
  }, [...new Set(weeks.map(w => w.season))].sort((a, b) => b - a).map(season => React.createElement("option", {
    key: season,
    value: season
  }, season, season < 2026 ? " Archive" : " Season"))), weeks.map((w, i) => w.season === week.season && React.createElement(Pill, {
    key: i,
    active: i === selectedIndex,
    onClick: () => setSelectedIndex(i)
  }, w.name)), React.createElement("button", {
    onClick: () => addWeek(),
    className: "btn-8bit secondary px-3 py-1.5 text-xs"
  }, "+ Add Week"))), React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-6"
  }, React.createElement(StatCard, {
    title: "Grand Total",
    value: sums.grandTotal,
    sub: "Entries at week lock"
  }), React.createElement(StatCard, {
    title: "Pre-Eliminated",
    value: sums.preOutTotal,
    sub: "No pick • Rule violations"
  }), React.createElement(StatCard, {
    title: "Eliminated (Live)",
    value: animElim,
    sub: `${fmt(sums.losers)} from losses/pushes`
  }), React.createElement(StatCard, {
    title: "Survivors",
    value: animSurv,
    sub: `${fmt(sums.pending)} pending · ${fmt(sums.safe)} safe`
  })), storageError && React.createElement("p", {
    role: "alert",
    className: "panel-8bit notice-warn p-3 mt-4"
  }, "Browser storage is unavailable. Export JSON to keep your changes."), sums.warnings.map(warning => React.createElement("p", {
    key: warning,
    role: "alert",
    className: "panel-8bit notice-warn p-3 mt-4"
  }, warning)), React.createElement("p", {
    className: "helper-8bit mt-3"
  }, week.source ? `Source: ${week.source}. ` : "", "Remaining includes entries with games still pending. Ties count as losses."), React.createElement("div", {
    className: "mt-4"
  }, React.createElement("div", {
    className: "progress-8bit overflow-hidden"
  }, React.createElement("div", {
    className: "bar",
    style: {
      width: `${Math.min(100, sums.pct).toFixed(2)}%`
    }
  })), React.createElement("div", {
    className: "helper-8bit mt-1"
  }, sums.pct.toFixed(1), "% eliminated")), syncNotice && React.createElement("div", {
    role: "alert",
    onClick: () => {
      if (syncNotice.action === "jump-to-warnings") jumpToWarnings();
    },
    className: `mt-6 panel-8bit px-4 py-3 text-sm flex items-center gap-3 ${syncNotice.type === "error" ? "notice-error" : syncNotice.type === "warn" ? "notice-warn" : syncNotice.type === "success" ? "notice-success" : "notice-info"} ${syncNotice.action ? "cursor-pointer" : ""}`
  }, React.createElement("span", {
    className: "pixel-font text-[11px] uppercase"
  }, syncNotice.type === "error" ? "[!]" : syncNotice.type === "warn" ? "[!]" : syncNotice.type === "success" ? "[✓]" : "[i]"), React.createElement("span", null, syncNotice.text)), React.createElement("div", {
    className: "grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8"
  }, React.createElement("div", {
    className: "lg:col-span-2"
  }, React.createElement("div", {
    className: "panel-8bit rounded-md overflow-hidden"
  }, React.createElement("div", {
    className: "px-5 py-4 border-b border-white/20 space-y-3"
  }, React.createElement("div", {
    className: "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
  }, React.createElement("div", {
    className: "flex items-center gap-2"
  }, React.createElement("h2", {
    className: "pixel-font text-sm"
  }, "Picks (", week.name, ")"), rosterStats.hasSecondPick && React.createElement("span", {
    className: "badge-8bit badge-pending"
  }, rosterStats.hasThirdPick ? "Three Picks" : "Two Picks")), hasRoster && React.createElement("div", {
    className: "flex flex-wrap items-center gap-2"
  }, React.createElement("span", {
    className: "helper-8bit text-xs"
  }, "View"), React.createElement("button", {
    className: `pill-8bit ${picksView === "teams" ? "active" : ""}`,
    onClick: () => setPicksView("teams")
  }, "Team Totals"), React.createElement("button", {
    className: `pill-8bit ${picksView === "roster" ? "active" : ""}`,
    onClick: () => setPicksView("roster")
  }, "Roster"))), picksView === "teams" ? React.createElement("div", {
    className: "flex flex-wrap gap-2 justify-between"
  }, React.createElement("div", {
    className: "flex flex-wrap gap-2"
  }, [{
    key: "all",
    label: "All"
  }, {
    key: "pending",
    label: "Pending"
  }, {
    key: "live",
    label: "Live"
  }, {
    key: "final",
    label: "Final"
  }].map(f => React.createElement("button", {
    key: f.key,
    className: `pill-8bit ${statusFilter === f.key ? "active" : ""}`,
    onClick: () => setStatusFilter(f.key)
  }, f.label))), React.createElement("div", {
    className: "flex flex-wrap items-center gap-2"
  }, React.createElement("span", {
    className: "helper-8bit text-xs"
  }, "Sort"), React.createElement("button", {
    className: `pill-8bit ${sortMode === "picks" ? "active" : ""}`,
    onClick: () => setSortMode("picks")
  }, "Picks ↓"), React.createElement("button", {
    className: `pill-8bit ${sortMode === "alpha" ? "active" : ""}`,
    onClick: () => setSortMode("alpha")
  }, "A–Z"))) : React.createElement("div", {
    className: "flex flex-wrap items-center justify-between gap-2"
  }, React.createElement("div", {
    className: "helper-8bit"
  }, "Entries: ", fmt(rosterStats.entries), " / Picks: ", fmt(rosterStats.picks)), React.createElement("input", {
    "aria-label": "Search entries",
    className: "input-8bit px-3 py-2",
    placeholder: "Find your entry…",
    value: rosterSearch,
    onChange: e => {
      setRosterSearch(e.target.value);
      setRosterPage(0);
    }
  }))), React.createElement("div", {
    className: "table-scroll overflow-x-auto"
  }, picksView === "roster" ? React.createElement("table", {
    className: "w-full text-sm table-8bit"
  }, React.createElement("thead", null, React.createElement("tr", {
    className: "text-left"
  }, React.createElement("th", {
    className: "px-4 py-3"
  }, "Name"), React.createElement("th", {
    className: "px-4 py-3"
  }, "Pick 1"), rosterStats.hasSecondPick && React.createElement("th", {
    className: "px-4 py-3"
  }, "Pick 2"), rosterStats.hasThirdPick && React.createElement("th", {
    className: "px-4 py-3"
  }, "Pick 3"), React.createElement("th", {
    className: "px-4 py-3"
  }, "Entry Status"))), React.createElement("tbody", null, visibleRoster.length === 0 && React.createElement("tr", null, React.createElement("td", {
    colSpan: 5,
    className: "px-4 py-6 text-center"
  }, "No matching entries.")), visibleRoster.map((entry, idx) => React.createElement("tr", {
    key: `${entry.name || "entry"}-${idx}`
  }, React.createElement("td", {
    className: "px-4 py-3 font-medium"
  }, entry.name || "-"), React.createElement("td", {
    className: "px-4 py-3"
  }, renderRosterPick(entry.pick1)), rosterStats.hasSecondPick && React.createElement("td", {
    className: "px-4 py-3"
  }, renderRosterPick(entry.pick2)), rosterStats.hasThirdPick && React.createElement("td", {
    className: "px-4 py-3"
  }, renderRosterPick(entry.pick3)), React.createElement("td", {
    className: "px-4 py-3"
  }, entry.preOutReason || entryStatus(entry, rosterResults, week.requiredPicks)))))) : React.createElement("table", {
    className: "w-full text-sm table-8bit"
  }, React.createElement("thead", null, React.createElement("tr", {
    className: "text-left"
  }, React.createElement("th", {
    className: "px-4 py-3"
  }, "Team"), React.createElement("th", {
    className: "px-4 py-3 text-right"
  }, "Picks"), React.createElement("th", {
    className: "px-4 py-3 text-center"
  }, "Result"), React.createElement("th", {
    className: "px-4 py-3 text-center"
  }, "Score"), React.createElement("th", {
    className: "px-4 py-3"
  }, "Game Status"), React.createElement("th", {
    className: "px-4 py-3 text-right"
  }, "Override"))), React.createElement("tbody", null, tableTeams.map((t, idx) => {
    const rowTone = t._isLive ? t.result === RESULT.Lose ? "table-row-lose" : t.result === RESULT.Win ? "table-row-win" : t.result === RESULT.Push ? "table-row-push" : "table-row-live" : "";
    return React.createElement("tr", {
      key: t.team + idx,
      className: rowTone
    }, React.createElement("td", {
      className: "px-4 py-3 font-medium"
    }, React.createElement("div", {
      className: "flex items-center gap-2"
    }, React.createElement(TeamIcon, {
      teamName: t.team
    }), React.createElement("span", null, t.team))), React.createElement("td", {
      className: "px-4 py-3 tabular-nums text-right"
    }, fmt(Number(t.count) || 0)), React.createElement("td", {
      className: "px-4 py-3 text-center"
    }, React.createElement(ResultBadge, {
      result: t.result
    })), React.createElement("td", {
      className: "px-4 py-3 tabular-nums text-center"
    }, renderScore(t)), React.createElement("td", {
      className: "px-4 py-3"
    }, React.createElement("div", {
      className: "space-y-1"
    }, React.createElement(LiveStatus, {
      live: t.live
    }), renderGameLine(t))), React.createElement("td", {
      className: "px-4 py-3 text-right"
    }, React.createElement(ResultControl, {
      value: t.result,
      onChange: value => setTeamResult(t.team, value)
    })));
  })))), picksView === "roster" && React.createElement("div", {
    className: "px-5 py-3 flex flex-wrap items-center justify-between gap-3"
  }, React.createElement("span", {
    className: "helper-8bit"
  }, fmt(filteredRoster.length), " entries · Page ", currentPage + 1, " of ", pageCount), React.createElement("div", {
    className: "flex gap-3"
  }, React.createElement("button", {
    className: "btn-8bit secondary px-3 py-2 disabled:opacity-40",
    disabled: currentPage === 0,
    onClick: () => setRosterPage(currentPage - 1)
  }, "Previous"), React.createElement("button", {
    className: "btn-8bit secondary px-3 py-2 disabled:opacity-40",
    disabled: currentPage >= pageCount - 1,
    onClick: () => setRosterPage(currentPage + 1)
  }, "Next"))), React.createElement("div", {
    className: "px-5 py-4 border-t border-white/20"
  }, React.createElement("h3", {
    className: "pixel-font text-xs mb-2 uppercase"
  }, "Already Out"), React.createElement("ul", {
    className: "space-y-1 text-sm"
  }, [...(week.preOut || []), ...Object.entries((week.entries || []).reduce((counts, e) => {
    if (e.preOutReason) counts[e.preOutReason] = (counts[e.preOutReason] || 0) + 1;
    return counts;
  }, {})).map(([label, count]) => ({
    label,
    count
  }))].map((p, i) => React.createElement("li", {
    key: i,
    className: "flex items-center justify-between"
  }, React.createElement("span", {
    className: "text-tecmo-white/80"
  }, p.label), React.createElement("span", {
    className: "font-medium tabular-nums"
  }, fmt(Number(p.count) || 0)))))))), React.createElement("div", {
    className: "space-y-6"
  }, React.createElement("div", {
    className: "panel-8bit p-5 rounded-md"
  }, React.createElement("div", {
    className: "flex items-center justify-between gap-3"
  }, React.createElement("h3", {
    className: "pixel-font text-sm uppercase"
  }, "Manage Weeks & Picks"), React.createElement("button", {
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
  }, opt.label))))), React.createElement("div", {
    className: "panel-8bit p-3 space-y-3"
  }, React.createElement("div", {
    className: "flex flex-wrap items-center gap-2"
  }, React.createElement("button", {
    onClick: () => fetchScores(),
    disabled: syncing,
    className: `btn-8bit warn inline-flex items-center gap-2 px-3 py-2 text-sm disabled:opacity-60`
  }, syncing ? "Syncing…" : "Sync Live Scores"), React.createElement("label", {
    className: "inline-flex items-center gap-2 text-xs"
  }, React.createElement("input", {
    type: "checkbox",
    className: "accent-[var(--tecmo-gold)]",
    checked: autoRefresh,
    onChange: e => setAutoRefresh(e.target.checked)
  }), React.createElement("span", {
    className: "helper-8bit"
  }, "Auto refresh every 60s"))), React.createElement("div", {
    className: "helper-8bit"
  }, "Source: ESPN public scoreboard API. Last sync:", " ", week.lastFetchedUtc ? formatPacific(week.lastFetchedUtc, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short"
  }) : "never"), (week.lastWarnings || []).length > 0 && React.createElement("div", {
    id: "warnings-panel",
    className: "panel-8bit notice-warn px-3 py-2 text-[11px]"
  }, React.createElement("div", {
    className: "pixel-font text-[11px]"
  }, "Teams needing manual review"), React.createElement("ul", {
    className: "mt-1 space-y-1"
  }, week.lastWarnings.map((w, i) => React.createElement("li", {
    key: i
  }, "• ", w))))), React.createElement("label", {
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
    className: "pixel-font"
  }, "Sync Live Scores"), " to pull ESPN results."), React.createElement("li", null, "Manual overrides still work — ties count as losses when syncing."), React.createElement("li", null, "Export/Import JSON for off-line backups between weeks."))))), React.createElement("div", {
    className: "mt-10 text-center text-xs text-tecmo-white/70"
  }, "Built for your LMS pool • Powered by ESPN live scores • Tecmo skin"));
}
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(React.createElement(App, null));
