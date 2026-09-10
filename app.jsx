const { useState, useMemo, useEffect, useRef, useCallback } = React;

    function useAnimatedNumber(value, duration = 600) {
      const [display, setDisplay] = useState(value);
      useEffect(() => {
        const from = display, to = value, start = performance.now();
        let raf;
        const tick = (now) => {
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

    const StatCard = ({ title, value, sub }) => (
      <div className="panel-8bit p-4">
        <div className="pixel-font text-[10px] text-tecmo-white/80 uppercase">{title}</div>
        <div className="mt-2 pixel-mono text-2xl">{fmt(value)}</div>
        {sub !== undefined && <div className="mt-1 helper-8bit">{sub}</div>}
      </div>
    );

    const Pill = ({ active, children, onClick }) => (
      <button onClick={onClick} className={`pill-8bit ${active ? "active" : ""}`}>
        {children}
      </button>
    );

    const ResultBadge = ({ result }) => {
      const map = {
        [RESULT.Pending]: "badge-pending",
        [RESULT.Win]: "badge-win",
        [RESULT.Lose]: "badge-lose",
        [RESULT.Push]: "badge-push",
      };
      return <span className={`badge-8bit ${map[result]}`}>{result}</span>;
    };

    const ResultControl = ({ value, onChange }) => (
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

    const LiveStatus = ({ live }) => {
      if (!live) return null;
      const isLive = !live.completed && live.state === "in";
      if (!isLive) return null;
      return (
        <span className="live-badge">
          <span className="w-2 h-2 rounded-full bg-[var(--tecmo-gold)] animate-pulse"></span>
          <span>Live</span>
          <span className="pixel-mono text-[11px]">{live.statusText || "In progress"}</span>
        </span>
      );
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
        try { stored = localStorage.getItem(AUTO_REFRESH_KEY); } catch { return true; }
        if (stored === null) return true;
        return stored === "true";
      });

      const week = weeks[selectedIndex] || weeks[0] || DEFAULT_WEEKS[0];
      stateRef.current = { weeks, selectedIndex };
      const selectedKey = weekIdentityKey(week);

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

      const jumpToWarnings = useCallback(() => {
        if (typeof document === "undefined") return;
        const el = document.getElementById("warnings-panel");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, []);

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
          else if (requestRef.current === controller) pushNotice({ type: "warn", text: "Score request timed out. Try Sync Live Scores again." });
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

      const animElim = useAnimatedNumber(sums.eliminated);
      const animSurv = useAnimatedNumber(sums.survivors);

      const teamLookup = useMemo(() => {
        const map = new Map();
        (week?.teams || []).forEach((team) => {
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
                  teams: (w.teams || []).map((t) => (t.team === teamName ? { ...t, result: nextResult, manualOverride: nextResult !== RESULT.Pending } : t)),
                }
          )
        );
      };

      const addWeek = () => {
        try {
          const nextWeek = nextWeekDefinition(weeks, week);
          setWeeks(prev => [...prev, nextWeek]);
          setSelectedIndex(weeks.length);
        } catch (error) { pushNotice({ type: "warn", text: error.message }); }
      };

      const changeSchedule = (field, value) => {
        if (!Number.isInteger(value) || value < 1 || (field === "season" && value < 1920) || (field === "seasonType" && value > 3) || (field === "weekNumber" && value > 18)) return;
        const next = { ...week, [field]: value };
        if (weeks.some((w,i) => i !== selectedIndex && weekIdentityKey(w) === weekIdentityKey(next))) {
          pushNotice({ type: "warn", text: "That season/week already exists. Select its tab instead." }); return;
        }
        setWeeks(prev => prev.map((w,i) => i !== selectedIndex ? w : { ...w, [field]: value, lastFetchedUtc: null, lastWarnings: [], lastSource: null, teams: w.teams.map(t => ({...t, result: RESULT.Pending, live: null, manualOverride: false})) }));
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
            i !== selectedIndex ? w : { ...w, totalsMode: "teams", entries: [], source: null, declaredGrandTotal: pastePreview.reduce((n,t) => n + t.count, 0) + w.preOut.reduce((n,p) => n + p.count, 0), teams: pastePreview.map((p) => ({ ...p, result: RESULT.Pending, live: null })) }
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
            return normalizeWeek({ ...w, source: null, totalsMode: "roster", entries: nextEntries, teams: nextTeams, declaredGrandTotal: nextEntries.length + w.preOut.reduce((n,p) => n + p.count, 0) });
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
              setWeeks(imported);
              setSelectedIndex(0);
              pushNotice({ type: "success", text: "Weeks import complete." });
            }
          } catch (error) {
            pushNotice({ type: "error", text: `Import failed: ${error.message}` });
          }
        };
        reader.readAsText(file);
      };

      const renderScore = (team) => {
        const live = team.live;
        if (!live) return "—";
        if (!Number.isFinite(live.teamScore) || !Number.isFinite(live.opponentScore)) return "—";
        return `${live.teamScore} – ${live.opponentScore}`;
      };

      const renderGameLine = (team) => {
        const live = team.live;
        if (!live) return team._status === "final" ? "Final (manual)" : "No live data";
        const vsAt = live.homeAway === "home" ? "vs" : "@";
        const opponent = live.opponent || live.opponentAbbr || "TBD";
        const statusText = live.completed
          ? "Final"
          : live.statusText || (live.state === "pre" ? formatGameTime(live.kickoff) : "In progress");
        return (
          <div>
            <div className="font-medium">{`${vsAt} ${opponent}`}</div>
            <div className="text-[11px] text-tecmo-white/70">{statusText}</div>
          </div>
        );
      };

      const renderRosterPick = (pickName) => {
        const label = (pickName || "").trim();
        if (!label) {
          return <span className="text-tecmo-white/40">-</span>;
        }
        const alias = aliasForTeam(label);
        const teamInfo = alias ? teamLookup.get(alias) : teamLookup.get(label.toUpperCase());
        const unknown = Boolean(label) && !alias;
        return (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <TeamIcon teamName={label} />
              <span className={unknown ? "text-[var(--tecmo-red)]" : ""}>{label}</span>
            </div>
            {teamInfo ? <ResultBadge result={teamInfo.result} /> : unknown ? (
              <span className="helper-8bit text-[var(--tecmo-red)]">Unknown</span>
            ) : null}
          </div>
        );
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

      return (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
          <section className="prize-board mb-6" aria-label="League scoreboard">
            <div className="board-topline pixel-font"><span>LMS / NFL</span><span>{week.season} SEASON</span><span>WEEK {String(week.weekNumber).padStart(2,"0")}</span></div>
            <div className="board-prize">
              <p className="pixel-font board-label">{week.season === 2026 ? "CASH PRIZE" : "SEASON ARCHIVE"}</p>
              <div className="pixel-font prize-digits">{week.season === 2026 ? "$390,000" : String(week.season)}</div>
              <p className="pixel-font board-tagline">LAST MAN STANDING</p>
            </div>
            <div className="board-counters">
              <div><span className="pixel-font">ENTRIES</span><strong className="pixel-mono">{fmt(sums.grandTotal)}</strong></div>
              <div><span className="pixel-font">REMAINING</span><strong className="pixel-mono board-green">{fmt(animSurv)}</strong></div>
              <div><span className="pixel-font">ELIMINATED</span><strong className="pixel-mono board-red">{fmt(animElim)}</strong></div>
            </div>
            <div className="board-footer pixel-mono"><span>{hasLiveGames ? "● GAMES LIVE" : "● LEAGUE TRACKER"}</span><span>{autoRefresh ? "AUTO SYNC / 60 SEC" : "MANUAL SYNC"}</span></div>
          </section>
          <div className="sticky-sync -mx-4 sm:-mx-6 px-4 sm:px-6 py-3">
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchScores()}
                  disabled={syncing}
                  className="btn-8bit warn inline-flex items-center gap-2 px-3 py-2 text-sm disabled:opacity-60"
                >
                  {syncing ? "Syncing…" : "Sync Live Scores"}
                </button>
                <span className="chip">
                  <span className="w-2 h-2 rounded-full bg-[var(--tecmo-gold)]"></span>
                  {autoRefreshText}
                </span>
              </div>
              <div className="chip text-xs">{lastSyncShort === "Never" ? "Waiting for first sync" : `Last sync: ${lastSyncShort}`}</div>
            </div>
          </div>

          {/* Header + week tabs */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h1 className="pixel-font text-tecmo-gold text-xl md:text-2xl">Last Man Standing – NFL</h1>
              <p className="helper-8bit mt-1">Live elimination tracker with one-click ESPN score sync.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <select aria-label="Season" className="select-8bit px-3 py-2" value={week.season} onChange={e => setSelectedIndex(weeks.findIndex(w => w.season === Number(e.target.value)))}>
                {[...new Set(weeks.map(w => w.season))].sort((a,b) => b-a).map(season => <option key={season} value={season}>{season}{season < 2026 ? " Archive" : " Season"}</option>)}
              </select>
              {weeks.map((w, i) => w.season === week.season && (
                <Pill key={i} active={i === selectedIndex} onClick={() => setSelectedIndex(i)}>
                  {w.name}
                </Pill>
              ))}
              <button
                onClick={() => addWeek()}
                className="btn-8bit secondary px-3 py-1.5 text-xs"
              >
                + Add Week
              </button>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <StatCard title="Grand Total" value={sums.grandTotal} sub="Entries at week lock" />
            <StatCard title="Pre-Eliminated" value={sums.preOutTotal} sub="No pick • Rule violations" />
            <StatCard title="Eliminated (Live)" value={animElim} sub={`${fmt(sums.losers)} from losses/pushes`} />
            <StatCard title="Survivors" value={animSurv} sub={`${fmt(sums.pending)} pending · ${fmt(sums.safe)} safe`} />
          </div>

          {storageError && <p role="alert" className="panel-8bit notice-warn p-3 mt-4">Browser storage is unavailable. Export JSON to keep your changes.</p>}
          {sums.warnings.map(warning => <p key={warning} role="alert" className="panel-8bit notice-warn p-3 mt-4">{warning}</p>)}
          <p className="helper-8bit mt-3">{week.source ? `Source: ${week.source}. ` : ""}Remaining includes entries with games still pending. Ties count as losses.</p>
          {/* Progress */}
          <div className="mt-4">
            <div className="progress-8bit overflow-hidden">
              <div className="bar" style={{ width: `${Math.min(100, sums.pct).toFixed(2)}%` }}></div>
            </div>
            <div className="helper-8bit mt-1">{sums.pct.toFixed(1)}% eliminated</div>
          </div>

          {/* Sync notice */}
          {syncNotice && (
            <div
              role="alert"
              onClick={() => {
                if (syncNotice.action === "jump-to-warnings") jumpToWarnings();
              }}
              className={`mt-6 panel-8bit px-4 py-3 text-sm flex items-center gap-3 ${
                syncNotice.type === "error"
                  ? "notice-error"
                  : syncNotice.type === "warn"
                  ? "notice-warn"
                  : syncNotice.type === "success"
                  ? "notice-success"
                  : "notice-info"
              } ${syncNotice.action ? "cursor-pointer" : ""}`}
            >
              <span className="pixel-font text-[11px] uppercase">
                {syncNotice.type === "error" ? "[!]" : syncNotice.type === "warn" ? "[!]" : syncNotice.type === "success" ? "[✓]" : "[i]"}
              </span>
              <span>{syncNotice.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
            <div className="lg:col-span-2">
              <div className="panel-8bit rounded-md overflow-hidden">
                <div className="px-5 py-4 border-b border-white/20 space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <h2 className="pixel-font text-sm">Picks ({week.name})</h2>
                      {rosterStats.hasSecondPick && (
                        <span className="badge-8bit badge-pending">{rosterStats.hasThirdPick ? "Three Picks" : "Two Picks"}</span>
                      )}
                    </div>
                    {hasRoster && (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="helper-8bit text-xs">View</span>
                        <button
                          className={`pill-8bit ${picksView === "teams" ? "active" : ""}`}
                          onClick={() => setPicksView("teams")}
                        >
                          Team Totals
                        </button>
                        <button
                          className={`pill-8bit ${picksView === "roster" ? "active" : ""}`}
                          onClick={() => setPicksView("roster")}
                        >
                          Roster
                        </button>
                      </div>
                    )}
                  </div>
                  {picksView === "teams" ? (
                    <div className="flex flex-wrap gap-2 justify-between">
                      <div className="flex flex-wrap gap-2">
                        {[
                          { key: "all", label: "All" },
                          { key: "pending", label: "Pending" },
                          { key: "live", label: "Live" },
                          { key: "final", label: "Final" },
                        ].map((f) => (
                          <button
                            key={f.key}
                            className={`pill-8bit ${statusFilter === f.key ? "active" : ""}`}
                            onClick={() => setStatusFilter(f.key)}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="helper-8bit text-xs">Sort</span>
                        <button
                          className={`pill-8bit ${sortMode === "picks" ? "active" : ""}`}
                          onClick={() => setSortMode("picks")}
                        >
                          Picks ↓
                        </button>
                        <button
                          className={`pill-8bit ${sortMode === "alpha" ? "active" : ""}`}
                          onClick={() => setSortMode("alpha")}
                        >
                          A–Z
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="helper-8bit">
                        Entries: {fmt(rosterStats.entries)} / Picks: {fmt(rosterStats.picks)}
                      </div>
                      <input aria-label="Search entries" className="input-8bit px-3 py-2" placeholder="Find your entry…" value={rosterSearch} onChange={e => { setRosterSearch(e.target.value); setRosterPage(0); }} />
                    </div>
                  )}
                </div>
                <div className="table-scroll overflow-x-auto">
                  {picksView === "roster" ? (
                    <table className="w-full text-sm table-8bit">
                      <thead>
                        <tr className="text-left">
                          <th className="px-4 py-3">Name</th>
                          <th className="px-4 py-3">Pick 1</th>
                          {rosterStats.hasSecondPick && <th className="px-4 py-3">Pick 2</th>}
                          {rosterStats.hasThirdPick && <th className="px-4 py-3">Pick 3</th>}
                          <th className="px-4 py-3">Entry Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleRoster.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center">No matching entries.</td></tr>}
                        {visibleRoster.map((entry, idx) => (
                          <tr key={`${entry.name || "entry"}-${idx}`}>
                            <td className="px-4 py-3 font-medium">{entry.name || "-"}</td>
                            <td className="px-4 py-3">{renderRosterPick(entry.pick1)}</td>
                            {rosterStats.hasSecondPick && (
                              <td className="px-4 py-3">{renderRosterPick(entry.pick2)}</td>
                            )}
                            {rosterStats.hasThirdPick && <td className="px-4 py-3">{renderRosterPick(entry.pick3)}</td>}
                            <td className="px-4 py-3">{entry.preOutReason || entryStatus(entry, rosterResults, week.requiredPicks)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <table className="w-full text-sm table-8bit">
                      <thead>
                        <tr className="text-left">
                          <th className="px-4 py-3">Team</th>
                          <th className="px-4 py-3 text-right">Picks</th>
                          <th className="px-4 py-3 text-center">Result</th>
                          <th className="px-4 py-3 text-center">Score</th>
                          <th className="px-4 py-3">Game Status</th>
                          <th className="px-4 py-3 text-right">Override</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tableTeams.map((t, idx) => {
                          const rowTone = t._isLive
                            ? t.result === RESULT.Lose
                              ? "table-row-lose"
                              : t.result === RESULT.Win
                              ? "table-row-win"
                              : t.result === RESULT.Push
                              ? "table-row-push"
                              : "table-row-live"
                            : "";
                          return (
                          <tr
                            key={t.team + idx}
                            className={rowTone}
                          >
                            <td className="px-4 py-3 font-medium">
                              <div className="flex items-center gap-2">
                                <TeamIcon teamName={t.team} />
                                <span>{t.team}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 tabular-nums text-right">{fmt(Number(t.count) || 0)}</td>
                            <td className="px-4 py-3 text-center"><ResultBadge result={t.result} /></td>
                            <td className="px-4 py-3 tabular-nums text-center">{renderScore(t)}</td>
                            <td className="px-4 py-3">
                              <div className="space-y-1">
                                <LiveStatus live={t.live} />
                                {renderGameLine(t)}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <ResultControl value={t.result} onChange={(value) => setTeamResult(t.team, value)} />
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                {picksView === "roster" && <div className="px-5 py-3 flex flex-wrap items-center justify-between gap-3">
                  <span className="helper-8bit">{fmt(filteredRoster.length)} entries · Page {currentPage + 1} of {pageCount}</span>
                  <div className="flex gap-3">
                    <button className="btn-8bit secondary px-3 py-2 disabled:opacity-40" disabled={currentPage === 0} onClick={() => setRosterPage(currentPage - 1)}>Previous</button>
                    <button className="btn-8bit secondary px-3 py-2 disabled:opacity-40" disabled={currentPage >= pageCount - 1} onClick={() => setRosterPage(currentPage + 1)}>Next</button>
                  </div>
                </div>}
                <div className="px-5 py-4 border-t border-white/20">
                  <h3 className="pixel-font text-xs mb-2 uppercase">Already Out</h3>
                  <ul className="space-y-1 text-sm">
                    {[...(week.preOut || []), ...Object.entries((week.entries || []).reduce((counts,e) => { if(e.preOutReason) counts[e.preOutReason] = (counts[e.preOutReason] || 0) + 1; return counts; }, {})).map(([label,count]) => ({label,count}))].map((p, i) => (
                      <li key={i} className="flex items-center justify-between">
                        <span className="text-tecmo-white/80">{p.label}</span>
                        <span className="font-medium tabular-nums">{fmt(Number(p.count) || 0)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="panel-8bit p-5 rounded-md">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="pixel-font text-sm uppercase">Manage Weeks & Picks</h3>
                  <button
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
                          prev.map((w, i) => (i === selectedIndex ? { ...w, name: value } : w))
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
                            i === selectedIndex ? { ...w, declaredGrandTotal: nonnegativeCount(value) } : w
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

                  <div className="panel-8bit p-3 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => fetchScores()}
                        disabled={syncing}
                        className={`btn-8bit warn inline-flex items-center gap-2 px-3 py-2 text-sm disabled:opacity-60`}
                      >
                        {syncing ? "Syncing…" : "Sync Live Scores"}
                      </button>
                      <label className="inline-flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          className="accent-[var(--tecmo-gold)]"
                          checked={autoRefresh}
                          onChange={(e) => setAutoRefresh(e.target.checked)}
                        />
                        <span className="helper-8bit">Auto refresh every 60s</span>
                      </label>
                    </div>
                    <div className="helper-8bit">
                      Source: ESPN public scoreboard API. Last sync:{" "}
                      {week.lastFetchedUtc
                        ? formatPacific(week.lastFetchedUtc, {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                            second: "2-digit",
                            timeZoneName: "short",
                          })
                        : "never"}
                    </div>
                    {(week.lastWarnings || []).length > 0 && (
                      <div id="warnings-panel" className="panel-8bit notice-warn px-3 py-2 text-[11px]">
                        <div className="pixel-font text-[11px]">Teams needing manual review</div>
                        <ul className="mt-1 space-y-1">
                          {week.lastWarnings.map((w, i) => (
                            <li key={i}>• {w}</li>
                          ))}
                        </ul>
                      </div>
                    )}
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
                          prev.map((w, i) => (i === selectedIndex ? { ...w, preOut } : w))
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
                  <li>Hit <span className="pixel-font">Sync Live Scores</span> to pull ESPN results.</li>
                  <li>Manual overrides still work — ties count as losses when syncing.</li>
                  <li>Export/Import JSON for off-line backups between weeks.</li>
                </ol>
              </div>
            </div>
          </div>

          <div className="mt-10 text-center text-xs text-tecmo-white/70">
            Built for your LMS pool • Powered by ESPN live scores • Tecmo skin
          </div>
        </div>
      );
    }

    const root = ReactDOM.createRoot(document.getElementById("root"));
    root.render(<App />);
