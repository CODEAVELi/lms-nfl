# LMS NFL tracker

Static GitHub Pages tracker for the 2026 Last Man Standing pool. The opening scoreboard displays the $390,000 cash prize. The season selector retains the 2025 Weeks 11–16 archive.

## Current data

`data/week1-2026.js` comes from **LMS Week 1 Picks.xlsx**, supplied September 10, 2026. The 4,827 unique entries reconcile exactly with every count in the workbook's TEAM QTY sheet: 4,817 team picks and 10 explicit No Pick entries. The public Week 1 payload contains aggregate team counts and a No Pick pre-out count only; participant names and IDs are not published. This matches the Week 11 aggregate layout. Names and all row-level picks are used locally to validate the import against TEAM QTY. Blank picks in a locally imported roster remain pending.

The earlier names-only workbook is superseded. The new workbook adds 15 entries.

## Updating a week

1. Choose the season, then Add Week. Numbering uses that season's highest NFL week number.
2. Paste the current week's roster as `Name,Pick 1,Pick 2,Pick 3` (CSV or Excel tabs). Only include the columns for that week; unused pick columns may be omitted. A header is accepted. Preview, resolve unknown team names, then Apply to Week. Team totals are derived from the roster.
3. For a single-pick week without an entry roster, `Team,Count` remains available.
4. In 2026, newly added Weeks 14–16 require two picks and Weeks 17–18 require three, matching the supplied workbook headers. Multiple-pick weeks require the roster so each eliminated entry is counted only once.
5. Additional Pre-Out counts cover entries **outside** the loaded roster only. No-pick entries inside a roster use `No Pick` in the pick column. Rule violations such as prior-week team reuse must be identified by the league; the app does not infer missing history.
6. Win/Lose/Push controls are manual overrides retained during refresh. Pending returns the team to ESPN control on the next sync. Ties count as losses. Remaining includes pending games; it is not a count of confirmed winners.

Edits persist in the current browser only. Export JSON for backups; publishing updates for everyone requires committing the updated default data to `main`. JSON import replaces the local working weeks; missing built-in weeks are restored on reload. The old `lmsNFL.weeks.v3` storage is left intact during migration to v4. Recognized historical templates are corrected to 2025, with saved edits retained.

## Source and checks

- `index.html`: page shell and styles, including the prize scoreboard.
- `tracker.js`: normalization, historical templates, imports, scoring and calculations.
- `app.jsx`: React UI; `app.js` is its checked-in compiled output. Visitors do not download Babel. React is pinned to 18.3.1; the original Tailwind CDN and Google Fonts remain.
- `scripts/import_week1.py`: reads the supplied workbook using Python's standard library, checks the roster against TEAM QTY, and generates aggregate Week 1 data without modifying the workbook or publishing participant names/IDs.

```sh
python scripts/import_week1.py '/path/to/LMS Week 1 Picks.xlsx'
node scripts/build_app.cjs
node --test tests/tracker.test.cjs
python -m http.server 8765
```

The build uses pinned Babel standalone 8.0.4 with the classic React runtime. An already downloaded copy can be provided as the build script's optional argument. Commit both `app.jsx` and regenerated `app.js` after UI changes. No deployment build or new Actions workflow is required.

Regression checks cover workbook reconciliation, the 2025 Week 11 reference, Week 16 double-counting, three-pick outcomes, CSV/Excel paste parsing, JSON imports, season migration, next-week numbering, ESPN aliases, missing scores, ties, manual overrides and storage failure. Live ESPN data must match the requested season, phase and week; missing matches produce a visible warning. Scores refresh once on selection and every 60 seconds, with in-flight requests canceled on selection changes.
