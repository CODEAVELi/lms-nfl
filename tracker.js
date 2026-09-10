    const RESULT = { Pending: "Pending", Win: "Win", Lose: "Lose", Push: "Push" };
    const STORAGE_KEY = "lmsNFL.weeks.v4";
    const AUTO_REFRESH_KEY = "lmsNFL.autoRefresh";
    const AUTO_REFRESH_INTERVAL_MS = 60_000;

    const SEASON_TYPES = [
      { value: 1, label: "Preseason" },
      { value: 2, label: "Regular Season" },
      { value: 3, label: "Postseason" },
    ];

    const TEAM_CATALOG = [
      { abbr: "ARI", names: ["Cardinals", "Arizona Cardinals", "Arizona", "Zona"] },
      { abbr: "ATL", names: ["Falcons", "Atlanta Falcons"] },
      { abbr: "BAL", names: ["Ravens", "Baltimore Ravens"] },
      { abbr: "BUF", names: ["Bills", "Buffalo Bills"] },
      { abbr: "CAR", names: ["Panthers", "Carolina Panthers"] },
      { abbr: "CHI", names: ["Bears", "Chicago Bears"] },
      { abbr: "CIN", names: ["Bengals", "Cincinnati Bengals"] },
      { abbr: "CLE", names: ["Browns", "Cleveland Browns"] },
      { abbr: "DAL", names: ["Cowboys", "Dallas Cowboys"] },
      { abbr: "DEN", names: ["Broncos", "Denver Broncos"] },
      { abbr: "DET", names: ["Lions", "Detroit Lions"] },
      { abbr: "GB", names: ["Packers", "Green Bay Packers", "Pack"] },
      { abbr: "HOU", names: ["Texans", "Houston Texans"] },
      { abbr: "IND", names: ["Colts", "Indianapolis Colts"] },
      { abbr: "JAX", names: ["Jaguars", "JAC", "Jacksonville Jaguars", "Jags"] },
      { abbr: "KC", names: ["Chiefs", "Kansas City Chiefs"] },
      { abbr: "LV", names: ["Raiders", "Las Vegas Raiders", "Oakland Raiders"] },
      { abbr: "LAC", names: ["Chargers", "Los Angeles Chargers", "LA Chargers", "San Diego Chargers", "Bolts"] },
      { abbr: "LAR", names: ["Rams", "Los Angeles Rams", "LA Rams", "St Louis Rams"] },
      { abbr: "MIA", names: ["Dolphins", "Miami Dolphins", "Fins"] },
      { abbr: "MIN", names: ["Vikings", "Minnesota Vikings", "Vikes"] },
      { abbr: "NE", names: ["Patriots", "New England Patriots", "Pats"] },
      { abbr: "NO", names: ["Saints", "New Orleans Saints", "Nola"] },
      { abbr: "NYG", names: ["Giants", "New York Giants", "NY Giants", "G-Men"] },
      { abbr: "NYJ", names: ["Jets", "New York Jets", "NY Jets"] },
      { abbr: "PHI", names: ["Eagles", "Philadelphia Eagles", "Philly"] },
      { abbr: "PIT", names: ["Steelers", "Pittsburgh Steelers"] },
      { abbr: "SF", names: ["49ers", "San Francisco 49ers", "Niners", "Forty Niners", "SF 49ers"] },
      { abbr: "SEA", names: ["Seahawks", "Seattle Seahawks", "Hawks"] },
      { abbr: "TB", names: ["Buccaneers", "Tampa Bay Buccaneers", "Bucs"] },
      { abbr: "TEN", names: ["Titans", "Tennessee Titans"] },
      { abbr: "WAS", names: ["Commanders", "WSH", "Washington Commanders", "Washington Football Team", "Football Team", "Redskins", "Washington"] },
    ];

    const TEAM_ALIASES = TEAM_CATALOG.reduce((acc, { abbr, names }) => {
      const uppercaseAbbr = abbr.toUpperCase();
      const canonical = uppercaseAbbr.replace(/[^A-Z0-9]/g, "");
      acc[uppercaseAbbr] = uppercaseAbbr;
      acc[canonical] = uppercaseAbbr;
      names.forEach((name) => {
        if (!name) return;
        const key = name.toUpperCase().replace(/[^A-Z0-9]/g, "");
        if (key) acc[key] = uppercaseAbbr;
      });
      return acc;
    }, {});
    const TEAM_DISPLAY = TEAM_CATALOG.reduce((acc, { abbr, names }) => {
      const key = (abbr || "").toUpperCase();
      if (!key) return acc;
      acc[key] = Array.isArray(names) && names.length ? names[0] : key;
      return acc;
    }, {});

    const fmt = (n) => Number.isFinite(n) ? n.toLocaleString() : "0";
    const PACIFIC_TZ = "America/Los_Angeles";

    // Forces all displayed kickoff and sync timestamps into Pacific Time.
    function formatPacific(value, options = {}) {
      if (!value) return "";
      const dt = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(dt.getTime())) return "";
      return new Intl.DateTimeFormat([], { timeZone: PACIFIC_TZ, ...options }).format(dt);
    }

    function getDefaultSeason() {
      const now = new Date();
      return now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
    }

    function normalizedResult(value) {
      const next = typeof value === "string" ? value.trim() : "";
      if (!Object.values(RESULT).includes(next)) {
        return RESULT.Pending;
      }
      return next === RESULT.Push ? RESULT.Lose : next;
    }

    function normalizeTeam(team = {}) {
      const count = Number(team.count);
      return {
        team: (team.team || "").trim(),
        count: nonnegativeCount(count),
        result: normalizedResult(team.result),
        live: team.live || null,
        manualOverride: Boolean(team.manualOverride),
      };
    }

    function normalizeEntry(entry = {}) {
      return {
        id: String(entry.id || ""),
        name: (entry.name || "").trim(),
        pick1: (entry.pick1 || entry.pick || "").trim(),
        pick2: (entry.pick2 || "").trim(),
        pick3: (entry.pick3 || "").trim(),
        preOutReason: (entry.preOutReason || "").trim(),
      };
    }

    function normalizeWeek(week = {}) {
      const declared = Number(week.declaredGrandTotal);
      return {
        name: week.name || "Week",
        totalsMode: week.totalsMode === "teams" ? "teams" : (week.entries?.length ? "roster" : "teams"),
        requiredPicks: Math.min(3, Math.max(Number(week.requiredPicks) || 1, week.entries?.some(e => e.pick3) ? 3 : week.entries?.some(e => e.pick2) ? 2 : 1)),
        source: week.source || null,
        localDraft: Boolean(week.localDraft),
        templateFingerprint: typeof week.templateFingerprint === "string" ? week.templateFingerprint : null,
        preOut: Array.isArray(week.preOut)
          ? week.preOut.map((p) => ({
              label: (p.label || "Pre-Out").trim(),
              count: nonnegativeCount(p.count),
            }))
          : [],
        teams: Array.isArray(week.teams) ? week.teams.map(normalizeTeam) : [],
        entries: Array.isArray(week.entries) ? week.entries.map(normalizeEntry) : [],
        declaredGrandTotal: nonnegativeCount(declared),
        season: Number.isFinite(Number(week.season)) ? Number(week.season) : getDefaultSeason(),
        weekNumber: Number.isFinite(Number(week.weekNumber)) ? Number(week.weekNumber) : 1,
        seasonType: Number.isFinite(Number(week.seasonType)) ? Number(week.seasonType) : 2,
        lastFetchedUtc: week.lastFetchedUtc || null,
        lastWarnings: Array.isArray(week.lastWarnings) ? week.lastWarnings : [],
        lastSource: week.lastSource || null,
      };
    }

    function weekIdentityKey(week = {}) {
      const season = Number.isFinite(Number(week.season)) ? Number(week.season) : getDefaultSeason();
      const seasonType = Number.isFinite(Number(week.seasonType)) ? Number(week.seasonType) : 2;
      const weekNumber = Number.isFinite(Number(week.weekNumber)) ? Number(week.weekNumber) : 1;
      return `${season}-${seasonType}-${weekNumber}`;
    }

    function fingerprintForWeekTemplate(week = {}) {
      const preOutPart = (week.preOut || [])
        .map((p) => `${p.label}::${nonnegativeCount(p.count)}`)
        .join("|");
      const teamPart = (week.teams || [])
        .map((t) => `${t.team}::${Number.isFinite(Number(t.count)) ? Number(t.count) : 0}`)
        .join("|");
      return `${weekIdentityKey(week)}::${preOutPart}::${teamPart}::${week.declaredGrandTotal}::${JSON.stringify(week.entries || [])}`;
    }

    function createWeekTemplate(definition = {}) {
      const normalized = normalizeWeek(definition);
      return {
        ...normalized,
        templateFingerprint: fingerprintForWeekTemplate(normalized),
      };
    }

    function cloneWeek(week = {}) {
      return {
        ...week,
        preOut: (week.preOut || []).map((p) => ({ ...p })),
        teams: (week.teams || []).map((t) => ({ ...t })),
        entries: (week.entries || []).map((e) => ({ ...e })),
        lastWarnings: Array.isArray(week.lastWarnings) ? [...week.lastWarnings] : [],
      };
    }

    const DEFAULT_WEEK16 = createWeekTemplate({
      name: "Week 16",
      season: 2025,
      seasonType: 2,
      weekNumber: 16,
      preOut: [],
      teams: [
        { team: "Texans", count: 23, result: RESULT.Pending },
        { team: "Eagles", count: 18, result: RESULT.Pending },
        { team: "Saints", count: 11, result: RESULT.Pending },
        { team: "49ers", count: 5, result: RESULT.Pending },
        { team: "Bengals", count: 3, result: RESULT.Pending },
        { team: "Bills", count: 3, result: RESULT.Pending },
        { team: "Vikings", count: 3, result: RESULT.Pending },
        { team: "Chiefs", count: 3, result: RESULT.Pending },
        { team: "Cardinals", count: 1, result: RESULT.Pending },
        { team: "Bears", count: 1, result: RESULT.Pending },
        { team: "Bucs", count: 1, result: RESULT.Pending },
      ],
      entries: [
        { name: "Aren G 5", pick1: "Texans", pick2: "Bengals" },
        { name: "Armen Mac 50 30", pick1: "Texans", pick2: "Eagles" },
        { name: "Arvin A 9", pick1: "49ers", pick2: "Eagles" },
        { name: "Bedig Packers 11", pick1: "Texans", pick2: "Eagles" },
        { name: "Diesel 1", pick1: "Texans", pick2: "Saints" },
        { name: "Don Nak 2", pick1: "Saints", pick2: "Vikings" },
        { name: "D Shah 3", pick1: "Texans", pick2: "Bengals" },
        { name: "D Shah 4", pick1: "Bills", pick2: "Saints" },
        { name: "Edmond Kesh Mush 20", pick1: "Eagles", pick2: "Saints" },
        { name: "Ed Oh 4", pick1: "Eagles", pick2: "49ers" },
        { name: "Ed Oh 12", pick1: "Texans", pick2: "Bills" },
        { name: "Edvin Vici 2", pick1: "Texans", pick2: "49ers" },
        { name: "Fuller 6", pick1: "Eagles", pick2: "Saints" },
        { name: "Emil G 7", pick1: "Texans", pick2: "Saints" },
        { name: "Emin Mikael 2", pick1: "Texans", pick2: "Eagles" },
        { name: "Fred Ros 8", pick1: "Texans", pick2: "Cardinals" },
        { name: "Gabriel 2", pick1: "Texans", pick2: "Saints" },
        { name: "Harout Oh 8", pick1: "Texans", pick2: "Eagles" },
        { name: "Harout Oh 11", pick1: "Vikings", pick2: "Saints" },
        { name: "Harout Oh 12", pick1: "49ers", pick2: "Chiefs" },
        { name: "Harout Tom 4", pick1: "Eagles", pick2: "Vikings" },
        { name: "Hovaness Ter 1", pick1: "Texans", pick2: "Chiefs" },
        { name: "Hrag 2", pick1: "Texans", pick2: "Eagles" },
        { name: "Ishkhan 7", pick1: "Eagles", pick2: "49ers" },
        { name: "John Keh 1", pick1: "Eagles", pick2: "Saints" },
        { name: "Labib 21", pick1: "Texans", pick2: "Bears" },
        { name: "Mikael 3", pick1: "Texans", pick2: "Eagles" },
        { name: "Mike B 5", pick1: "Texans", pick2: "Eagles" },
        { name: "Nick Caddy Daddy 1", pick1: "Texans", pick2: "Eagles" },
        { name: "Sarmen Cash 9", pick1: "Eagles", pick2: "Saints" },
        { name: "Henry", pick1: "Texans", pick2: "Eagles" },
        { name: "Silky 18", pick1: "Texans", pick2: "Saints" },
        { name: "Silky 29", pick1: "Bucs", pick2: "Texans" },
        { name: "Spencer B 2", pick1: "Texans", pick2: "Chiefs" },
        { name: "VikesG63 3", pick1: "Texans", pick2: "Bengals" },
        { name: "Zorch 2", pick1: "Bills", pick2: "Eagles" },
      ],
      declaredGrandTotal: 36,
    });

    const DEFAULT_WEEK15 = createWeekTemplate({
      name: "Week 15",
      season: 2025,
      seasonType: 2,
      weekNumber: 15,
      preOut: [],
      teams: [
        { team: "49ers", count: 15, result: RESULT.Pending },
        { team: "Bears", count: 11, result: RESULT.Pending },
        { team: "Eagles", count: 6, result: RESULT.Pending },
        { team: "Jaguars", count: 4, result: RESULT.Pending },
      ],
      declaredGrandTotal: 36,
    });

    const DEFAULT_WEEK14 = createWeekTemplate({
      name: "Week 14",
      season: 2025,
      seasonType: 2,
      weekNumber: 14,
      preOut: [{ label: "No Pick – Out", count: 1 }],
      teams: [
        { team: "Bucs", count: 107, result: RESULT.Pending },
        { team: "Browns", count: 62, result: RESULT.Pending },
        { team: "Seahawks", count: 11, result: RESULT.Pending },
        { team: "Broncos", count: 9, result: RESULT.Pending },
        { team: "Rams", count: 6, result: RESULT.Pending },
        { team: "Vikings", count: 4, result: RESULT.Pending },
        { team: "Dolphins", count: 4, result: RESULT.Pending },
        { team: "Eagles", count: 3, result: RESULT.Pending },
        { team: "Colts", count: 1, result: RESULT.Pending },
        { team: "Ravens", count: 1, result: RESULT.Pending },
        { team: "Bills", count: 1, result: RESULT.Pending },
        { team: "Packers", count: 1, result: RESULT.Pending },
        { team: "Chiefs", count: 1, result: RESULT.Pending },
      ],
      declaredGrandTotal: 212,
    });

    const DEFAULT_WEEK13 = createWeekTemplate({
      name: "Week 13",
      season: 2025,
      seasonType: 2,
      weekNumber: 13,
      preOut: [{ label: "No Pick – Out", count: 1 }],
      teams: [
        { team: "Chargers", count: 139, result: RESULT.Pending },
        { team: "Dolphins", count: 33, result: RESULT.Pending },
        { team: "Jaguars", count: 22, result: RESULT.Pending },
        { team: "Rams", count: 14, result: RESULT.Pending },
        { team: "Seahawks", count: 9, result: RESULT.Pending },
        { team: "Eagles", count: 9, result: RESULT.Pending },
        { team: "Patriots", count: 3, result: RESULT.Pending },
        { team: "Ravens", count: 2, result: RESULT.Pending },
        { team: "Broncos", count: 2, result: RESULT.Pending },
        { team: "49ers", count: 2, result: RESULT.Pending },
        { team: "Jets", count: 2, result: RESULT.Pending },
        { team: "Colts", count: 1, result: RESULT.Pending },
      ],
      declaredGrandTotal: 239,
    });

    const DEFAULT_WEEK12 = createWeekTemplate({
      name: "Week 12",
      season: 2025,
      seasonType: 2,
      weekNumber: 12,
      preOut: [],
      teams: [
        { team: "Ravens", count: 82, result: RESULT.Pending },
        { team: "49ers", count: 68, result: RESULT.Pending },
        { team: "Seahawks", count: 59, result: RESULT.Pending },
        { team: "Lions", count: 12, result: RESULT.Pending },
        { team: "Patriots", count: 6, result: RESULT.Pending },
        { team: "Jaguars", count: 5, result: RESULT.Pending },
        { team: "Packers", count: 3, result: RESULT.Pending },
        { team: "Raiders", count: 3, result: RESULT.Pending },
        { team: "Eagles", count: 2, result: RESULT.Pending },
        { team: "Bills", count: 2, result: RESULT.Pending },
        { team: "Rams", count: 2, result: RESULT.Pending },
        { team: "Bears", count: 1, result: RESULT.Pending },
        { team: "Cowboys", count: 1, result: RESULT.Pending },
        { team: "Saints", count: 1, result: RESULT.Pending },
      ],
      declaredGrandTotal: 247,
    });

    const DEFAULT_WEEK10 = createWeekTemplate({
      name: "Week 10",
      season: 2025,
      seasonType: 2,
      weekNumber: 10,
      preOut: [
        { label: "No Pick – Out", count: 2 },
        { label: "Late Pick – Out", count: 1 },
      ],
      teams: [
        { team: "Panthers", count: 141, result: RESULT.Pending },
        { team: "Broncos", count: 113, result: RESULT.Pending },
        { team: "Seahawks", count: 70, result: RESULT.Pending },
        { team: "Bills", count: 52, result: RESULT.Pending },
        { team: "Bears", count: 31, result: RESULT.Pending },
        { team: "Lions", count: 29, result: RESULT.Pending },
        { team: "Colts", count: 8, result: RESULT.Pending },
        { team: "Browns", count: 6, result: RESULT.Pending },
        { team: "Bucs", count: 3, result: RESULT.Pending },
        { team: "Rams", count: 3, result: RESULT.Pending },
        { team: "Ravens", count: 3, result: RESULT.Pending },
        { team: "Chargers", count: 3, result: RESULT.Pending },
        { team: "Jets", count: 1, result: RESULT.Pending },
      ],
      declaredGrandTotal: 466,
    });

    const DEFAULT_WEEK11 = createWeekTemplate({
      name: "Week 11",
      season: 2025,
      seasonType: 2,
      weekNumber: 11,
      preOut: [
        { label: "Late Pick – Out", count: 1 },
        { label: "Patriots Twice – Out", count: 1 },
      ],
      teams: [
        { team: "Patriots", count: 114, result: RESULT.Pending },
        { team: "Ravens", count: 50, result: RESULT.Pending },
        { team: "Texans", count: 33, result: RESULT.Pending },
        { team: "Packers", count: 15, result: RESULT.Pending },
        { team: "Cowboys", count: 15, result: RESULT.Pending },
        { team: "Steelers", count: 11, result: RESULT.Pending },
        { team: "Falcons", count: 9, result: RESULT.Pending },
        { team: "49ers", count: 7, result: RESULT.Pending },
        { team: "Vikings", count: 2, result: RESULT.Pending },
        { team: "Bills", count: 2, result: RESULT.Pending },
        { team: "Chiefs", count: 1, result: RESULT.Pending },
      ],
      declaredGrandTotal: 261,
    });

    const DEFAULT_2026 = createWeekTemplate({
      name: "Week 1", season: 2026, seasonType: 2, weekNumber: 1,
      declaredGrandTotal: LMS_WEEK1_2026.entryCount,
      preOut: [{ label: "No Pick – Out", count: LMS_WEEK1_2026.noPickCount }],
      teams: LMS_WEEK1_2026.teams,
      source: LMS_WEEK1_2026.source,
    });
    const ARCHIVE_WEEKS = [DEFAULT_WEEK16, DEFAULT_WEEK15, DEFAULT_WEEK14, DEFAULT_WEEK13, DEFAULT_WEEK12, DEFAULT_WEEK11];
    const DEFAULT_WEEKS = [DEFAULT_2026, ...ARCHIVE_WEEKS];

    // Ensures stored data is upgraded with fresh default templates when week payloads change.
    function mergeStoredWeeksWithDefaults(storedWeeks = []) {
      const defaults = DEFAULT_WEEKS || [];
      const map = new Map();
      (storedWeeks || []).forEach((week) => {
        const normalized = normalizeWeek(week);
        map.set(weekIdentityKey(normalized), normalized);
      });

      const merged = [];

      defaults.forEach((template) => {
        const key = weekIdentityKey(template);
        const existing = map.get(key);
        if (!existing) {
          merged.push(cloneWeek(template));
          return;
        }
        // Existing edits and overrides win; defaults only supply missing weeks.
        merged.push(existing);
        map.delete(key);
      });

      map.forEach((week) => {
        merged.push(week);
      });

      return merged.length ? merged : defaults.map(cloneWeek);
    }

    function loadInitialWeeks() {
      if (typeof window !== "undefined") {
        try {
          const current = localStorage.getItem(STORAGE_KEY);
          const raw = current || localStorage.getItem("lmsNFL.weeks.v3");
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length) {
              return mergeStoredWeeksWithDefaults(current ? parsed : migrateLegacyWeeks(parsed));
            }
            if (parsed && typeof parsed === "object" && Array.isArray(parsed.weeks) && parsed.weeks.length) {
              return mergeStoredWeeksWithDefaults(current ? parsed.weeks : migrateLegacyWeeks(parsed.weeks));
            }
          }
        } catch (_) {
          console.warn("Could not load stored LMS weeks");
        }
      }
      return DEFAULT_WEEKS.map(cloneWeek);
    }

    function aliasForTeam(name) {
      const key = (name || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
      return TEAM_ALIASES[key] || null;
    }

    function buildTeamsFromEntries(entries = [], existingTeams = []) {
      const existingByAlias = new Map();
      const existingByName = new Map();

      (existingTeams || []).forEach((team) => {
        const nameKey = (team.team || "").toUpperCase();
        if (nameKey && !existingByName.has(nameKey)) {
          existingByName.set(nameKey, team);
        }
        const alias = aliasForTeam(team.team);
        if (alias && !existingByAlias.has(alias)) {
          existingByAlias.set(alias, team);
        }
      });

      const counts = new Map();

      const addPick = (pickName) => {
        const clean = (pickName || "").trim();
        if (!clean) return;
        const alias = aliasForTeam(clean);
        const display = alias ? (TEAM_DISPLAY[alias] || clean) : clean;
        const key = alias || display.toUpperCase();
        const existing = counts.get(key);
        if (existing) {
          existing.count += 1;
          return;
        }
        const snapshot = (alias && existingByAlias.get(alias)) || existingByName.get(display.toUpperCase());
        counts.set(key, {
          team: display,
          count: 1,
          result: snapshot?.result || RESULT.Pending,
          live: snapshot?.live || null,
          manualOverride: Boolean(snapshot?.manualOverride),
        });
      };

      (entries || []).forEach((entry) => {
        if (entry.preOutReason) return;
        addPick(entry.pick1);
        addPick(entry.pick2);
        addPick(entry.pick3);
      });

      return Array.from(counts.values());
    }

    function buildScoreIndex(events = []) {
      const index = {};
      (events || []).forEach((event) => {
        const competition = event.competitions?.[0];
        if (!competition) return;
        const statusType = competition.status?.type || {};
        const statusText = statusType.shortDetail || statusType.detail || "";
        const competitors = competition.competitors || [];
        competitors.forEach((competitor) => {
          const opponent = competitors.find((c) => c.id !== competitor.id);
          const abbr = competitor?.team?.abbreviation;
          if (!abbr) return;
          index[aliasForTeam(abbr) || abbr.toUpperCase()] = {
            competitor,
            opponent,
            status: statusType,
            statusText,
            date: competition.date,
            eventId: event.id,
          };
        });
      });
      return index;
    }

    function formatGameTime(iso) {
      return formatPacific(iso, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      });
    }

    function finalResultFromScores(usScore, themScore) {
      if (!Number.isFinite(usScore) || !Number.isFinite(themScore)) return RESULT.Pending;
      if (usScore > themScore) return RESULT.Win;
      return RESULT.Lose;
    }

    function nonnegativeCount(value) {
      const number = Number(value);
      return Number.isSafeInteger(number) && number >= 0 ? number : 0;
    }

    function migrateLegacyWeeks(weeks) {
      return weeks.map(week => {
        // v3's built-in 2025 templates used the current year. Repair only
        // recognized templates; retain every custom week and all user edits.
        const template = [...ARCHIVE_WEEKS, DEFAULT_WEEK10].find(t => t.weekNumber === week.weekNumber);
        const fingerprint = week.templateFingerprint || "";
        const original = template && fingerprintForWeekTemplate(template).split("::").slice(1, -2).join("::");
        const recognized = template && (fingerprint.includes(original) ||
          JSON.stringify((week.teams || []).map(t => [t.team, t.count])) === JSON.stringify(template.teams.map(t => [t.team, t.count])));
        return normalizeWeek(recognized ? { ...week, season: 2025 } : week);
      });
    }

    function teamResultLookup(teams) {
      return new Map(teams.map(t => [aliasForTeam(t.team) || t.team.toUpperCase(), normalizedResult(t.result)]));
    }

    function entryStatus(entry, results, requiredPicks = 1) {
      if (entry.preOutReason) return "Pre-Out";
      const picks = [entry.pick1, entry.pick2, entry.pick3].filter(Boolean);
      const outcomes = picks.map(pick => results.get(aliasForTeam(pick) || pick.toUpperCase()) || RESULT.Pending);
      if (outcomes.includes(RESULT.Lose)) return "Out";
      if (picks.length < requiredPicks || outcomes.includes(RESULT.Pending)) return "Pending";
      return "Safe";
    }

    function calculateWeek(week) {
      const teams = week.teams || [];
      const entries = week.entries || [];
      const picksTotal = teams.reduce((sum, t) => sum + nonnegativeCount(t.count), 0);
      const externalPreOut = (week.preOut || []).reduce((sum, p) => sum + nonnegativeCount(p.count), 0);
      const rosterMode = week.totalsMode !== "teams" && entries.length > 0;
      let losers = 0, rosterPreOut = 0, pending = 0, safe = 0;
      if (rosterMode) {
        const results = teamResultLookup(teams);
        entries.forEach(entry => {
          const status = entryStatus(entry, results, week.requiredPicks);
          if (status === "Pre-Out") rosterPreOut++;
          else if (status === "Out") losers++;
          else if (status === "Safe") safe++;
          else pending++;
        });
      } else {
        teams.forEach(t => {
          const result = normalizedResult(t.result);
          if (result === RESULT.Lose) losers += nonnegativeCount(t.count);
          else if (result === RESULT.Win) safe += nonnegativeCount(t.count);
          else pending += nonnegativeCount(t.count);
        });
      }
      const preOutTotal = externalPreOut + rosterPreOut;
      const accountedTotal = rosterMode ? entries.length + externalPreOut : picksTotal + preOutTotal;
      const grandTotal = nonnegativeCount(week.declaredGrandTotal) || accountedTotal;
      const eliminated = preOutTotal + losers;
      const survivors = Math.max(0, grandTotal - eliminated);
      const warnings = [];
      if (grandTotal !== accountedTotal) warnings.push(`Total mismatch: ${fmt(grandTotal)} declared; ${fmt(accountedTotal)} accounted for.`);
      if (rosterMode) {
        const derived = buildTeamsFromEntries(entries);
        const counts = new Map(teams.map(t => [aliasForTeam(t.team) || t.team.toUpperCase(), t.count]));
        if (derived.length !== teams.length || derived.some(t => counts.get(aliasForTeam(t.team) || t.team.toUpperCase()) !== t.count)) warnings.push("Roster picks and team totals differ. Reapply the roster to reconcile them.");
      }
      if (!rosterMode && week.requiredPicks > 1) warnings.push("Multiple-pick weeks require an entry roster for accurate eliminations.");
      return { picksTotal, preOutTotal, losers, eliminated, survivors, pending, safe, grandTotal, warnings, pct: grandTotal ? eliminated / grandTotal * 100 : 0 };
    }

    function parseDelimited(text) {
      const delimiter = text.includes("\t") ? "\t" : ",";
      const rows = []; let row = [], cell = "", quoted = false;
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch === '"') {
          if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
          else quoted = !quoted;
        } else if (!quoted && (ch === delimiter || ch === "\n")) {
          row.push(cell.trim()); cell = "";
          if (ch === "\n") { if (row.some(Boolean)) rows.push(row); row = []; }
        } else if (ch !== "\r") cell += ch;
      }
      if (quoted) throw new Error("Unclosed quote in pasted data.");
      row.push(cell.trim()); if (row.some(Boolean)) rows.push(row);
      return rows;
    }

    function parseRosterText(text) {
      const rows = parseDelimited(text);
      const header = rows[0] || [];
      const hasIndex = header[0] === "#";
      if (/^(name|entry names)$/i.test(header[hasIndex ? 1 : 0] || "")) rows.shift();
      const names = new Set();
      return rows.map((row, i) => {
        const cells = hasIndex ? row.slice(1) : row;
        if (cells.length > 4) throw new Error("Paste Name and up to three picks for the selected week only.");
        const [name, pick1 = "", pick2 = "", pick3 = ""] = cells;
        if (!name) throw new Error(`Missing name on row ${i + 1}.`);
        if (names.has(name)) throw new Error(`Duplicate entry name: ${name}`);
        names.add(name);
        const noPick = [pick1, pick2, pick3].some(p => /^no pick$/i.test(p));
        return normalizeEntry({ name, pick1: noPick ? "" : pick1, pick2: noPick ? "" : pick2, pick3: noPick ? "" : pick3, preOutReason: noPick ? "No Pick" : "" });
      });
    }

    function parseTeamsText(text) {
      const rows = parseDelimited(text);
      if (/^team$/i.test(rows[0]?.[0] || "")) rows.shift();
      const seen = new Set();
      return rows.map(([team, raw, ...extra]) => {
        if (!team || !raw || extra.length || !Number.isSafeInteger(Number(raw)) || Number(raw) < 0) throw new Error("Each team needs a nonnegative whole-number count.");
        const key = aliasForTeam(team) || team.toUpperCase();
        if (seen.has(key)) throw new Error(`Duplicate team: ${team}`);
        seen.add(key);
        return normalizeTeam({ team, count: Number(raw) });
      });
    }

    function applyScoreboard(week, data) {
      if (!Array.isArray(data.events) || !data.events.length) throw new Error("ESPN returned no games for this season/week.");
      if (data.season?.year && Number(data.season.year) !== week.season) throw new Error("ESPN returned a different season.");
      if (data.week?.number && Number(data.week.number) !== week.weekNumber) throw new Error("ESPN returned a different week.");
      if (data.season?.type && Number(data.season.type) !== week.seasonType) throw new Error("ESPN returned a different season phase.");
      const index = buildScoreIndex(data.events);
      const warnings = [];
      const teams = week.teams.map(team => {
        const info = index[aliasForTeam(team.team)];
        if (!info) { warnings.push(`No live data for "${team.team}" – check spelling or week.`); return { ...team, live: null }; }
        const status = info.status;
        const state = (status.state || "").toLowerCase();
        const completed = Boolean(status.completed); // Postponed/canceled is not a final score.
        const score = value => value === null || value === undefined || value === "" ? NaN : Number(value);
        const us = score(info.competitor.score), them = score(info.opponent?.score);
        const result = team.manualOverride ? team.result : completed ? finalResultFromScores(us, them) : RESULT.Pending;
        return { ...team, result, live: {
          opponent: info.opponent?.team?.shortDisplayName || info.opponent?.team?.displayName || "",
          opponentAbbr: info.opponent?.team?.abbreviation || "", teamScore: Number.isFinite(us) ? us : null,
          opponentScore: Number.isFinite(them) ? them : null, state, completed,
          statusText: state === "pre" ? formatGameTime(info.date) : info.statusText,
          kickoff: info.date, homeAway: info.competitor.homeAway,
        }};
      });
      return { ...week, teams, lastFetchedUtc: new Date().toISOString(), lastWarnings: warnings, lastSource: "espn" };
    }

    function nextWeekDefinition(weeks, currentWeek) {
      const weekNumber = Math.max(...weeks.filter(w => w.season === currentWeek.season && w.seasonType === currentWeek.seasonType).map(w => w.weekNumber), 0) + 1;
      if (currentWeek.seasonType === 2 && weekNumber > 18) throw new Error("The regular season ends at Week 18.");
      return normalizeWeek({ name: `Week ${weekNumber}`, season: currentWeek.season, seasonType: currentWeek.seasonType, weekNumber,
        requiredPicks: currentWeek.season === 2026 && currentWeek.seasonType === 2 ? (weekNumber >= 17 ? 3 : weekNumber >= 14 ? 2 : 1) : 1 });
    }

    function validateImportedWeeks(payload) {
      const weeks = Array.isArray(payload) ? payload : payload?.weeks;
      if (!Array.isArray(weeks) || !weeks.length) throw new Error("Expected a nonempty weeks array.");
      const keys = new Set();
      return weeks.map(week => {
        if (!week || typeof week !== "object" || !Array.isArray(week.teams)) throw new Error("Every week must contain a teams array.");
        for (const field of ["season", "weekNumber", "seasonType"]) {
          if (!Number.isInteger(week[field]) || week[field] < 1) throw new Error(`Invalid ${field}.`);
        }
        if (week.seasonType > 3 || (week.seasonType === 2 && week.weekNumber > 18)) throw new Error("Invalid season phase or week number.");
        for (const team of week.teams) {
          if (!team || typeof team.team !== "string" || !aliasForTeam(team.team) || !Number.isSafeInteger(team.count) || team.count < 0) throw new Error("Invalid team or count.");
        }
        if (week.entries !== undefined && !Array.isArray(week.entries)) throw new Error("Invalid entries array.");
        for (const entry of week.entries || []) {
          if (!entry || typeof entry.name !== "string" || !entry.name.trim()) throw new Error("Invalid entry name.");
          for (const pick of [entry.pick1, entry.pick2, entry.pick3]) if (pick && (typeof pick !== "string" || !aliasForTeam(pick))) throw new Error("Unknown roster pick.");
        }
        if (week.preOut !== undefined && !Array.isArray(week.preOut)) throw new Error("Invalid pre-out array.");
        for (const item of week.preOut || []) if (!item || typeof item.label !== "string" || !Number.isSafeInteger(item.count) || item.count < 0) throw new Error("Invalid pre-out count.");
        if (week.declaredGrandTotal !== undefined && (!Number.isSafeInteger(week.declaredGrandTotal) || week.declaredGrandTotal < 0)) throw new Error("Invalid grand total.");
        const normalized = normalizeWeek(week);
        const key = weekIdentityKey(normalized);
        if (keys.has(key)) throw new Error("Duplicate season/week in import.");
        keys.add(key);
        return normalized;
      });
    }

    function runSanityChecks() {
      if (typeof console === "undefined") return;
      const checks = [
        ["Alias: Chiefs -> KC", aliasForTeam("Chiefs") === "KC"],
        ["Alias: 49ers -> SF", aliasForTeam("49ers") === "SF"],
        ["Alias: LA Chargers -> LAC", aliasForTeam("LA Chargers") === "LAC"],
        ["Tie resolves to loss", finalResultFromScores(21, 21) === RESULT.Lose],
      ];
      if (console.groupCollapsed) console.groupCollapsed("LMS NFL validation");
      checks.forEach(([label, pass]) => {
        console[pass ? "log" : "warn"](`${pass ? "[OK]" : "[WARN]"} ${label}`);
      });
      if (console.groupEnd) console.groupEnd();
    }

    runSanityChecks();
