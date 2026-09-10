# LMS NFL tracker

Static GitHub Pages tracker for the 2026 Last Man Standing pool. The opening scoreboard displays the $390,000 cash prize. The season selector retains the 2025 Weeks 11–16 archive.

## Current data

`data/week1-2026.js` comes from **LMS Week 1 Picks.xlsx**, supplied September 10, 2026. The 4,827 unique entries reconcile exactly with every count in the workbook's TEAM QTY sheet: 4,817 team picks and 10 explicit No Pick entries. The public Week 1 payload contains aggregate team counts and a No Pick pre-out count only; participant names and IDs are not published. This matches the Week 11 aggregate layout. Names and all row-level picks are used locally to validate the import against TEAM QTY. Blank picks in a locally imported roster remain pending.

The earlier names-only workbook is superseded. The new workbook adds 15 entries.

## Game-day view

Viewer is the default. One sticky strip reports Remaining, Safe, Pending and Out; Remaining includes Safe + Pending. Responsive game cards show scores, Pacific kickoff times, picked entry counts and share of the starting field. Status filters and sorting help find games without repeating the scoreboard totals.

- **My Picks** watches teams per season/week, pins them first and optionally filters the game list. It stays on this device and does not submit league picks.
- **What if a team loses?** calculates additional eliminations relative to current results. Roster-based calculations account for overlapping picks; aggregate multi-pick weeks cannot provide an exact scenario.
- **Weekly recap** creates a downloadable PNG of the current aggregate results, with native file sharing where supported. It labels provisional results, local working copies and manual overrides. Participant names are excluded. The 2026 prize is not applied to the archive.
- Supporting text uses a system font; headings and large figures retain the pixel style. Controls have 44px minimum height, labeled inputs, visible keyboard focus, a skip link and reduced-motion support. The recap uses a native modal dialog with Escape dismissal and focus restoration.

## Updating a week

1. Switch to **Commissioner** and drop or choose the current `.xlsx` workbook. This is a local workspace, not an authenticated publishing console.
2. Confirm the detected sheet, season and week. The importer recognizes `Name` and `Week N` / `Week N - Pick K` headers. It defaults to the latest populated week. Preview includes entry counts, pick counts, team totals, exceptions and a collapsed sample of local entries.
3. Unknown teams, duplicate entry names, duplicate picks and mismatched summary counts block application. A matching `Week N` / count summary sheet is reconciled when available. Blank picks remain pending unless you explicitly exclude those rows as previously eliminated entries. The app does not infer prior-week rule violations.
4. Review the replacement acknowledgment, then **Apply reviewed week**. The upload replaces only the matching season/week locally. Workbook parsing runs in a worker with a 10 MB file limit, a 20-second timeout, and limits of 20,000 rows and 100 columns per sheet.
5. **Advanced editing & backups** contains new-week creation, JSON backups and CSV/Excel paste tools. Newly added 2026 Weeks 14–16 require two picks and Weeks 17–18 require three. Multiple-pick weeks need an entry roster to count each elimination once.
6. Additional Pre-Out counts represent entries outside the loaded roster. `No Pick` inside a roster is an explicit pre-out. Blank picks remain pending.
7. Result overrides are available on game cards in Commissioner view. Pending returns the team to ESPN control on the next sync. Win/Lose/Push overrides persist across refreshes; ties count as losses.

Edits persist in the current browser only. Export JSON for backups; publishing updates for everyone requires committing the updated default data to `main`. JSON import replaces the local working weeks; missing built-in weeks are restored on reload. The old `lmsNFL.weeks.v3` storage is left intact during migration to v4. Recognized historical templates are corrected to 2025, with saved edits retained.

## Source and checks

- `index.html`: page shell and styles, including the prize scoreboard.
- `tracker.js`: normalization, historical templates, imports, scoring and calculations.
- `companion.js`: watchlists, exposure scenarios, workbook validation and aggregate recap images.
- `workbook-worker.js`: browser-only XLSX decoding using vendored SheetJS CE 0.20.3 (`vendor/LICENSE-SheetJS.txt`). Workbook bytes and local rosters are not transmitted.
- `app.jsx`: React UI; `app.js` is its checked-in compiled output. Visitors do not download Babel. React is pinned to 18.3.1; the original Tailwind CDN and Google Fonts remain.
- `scripts/import_week1.py`: reads the supplied workbook using Python's standard library, checks the roster against TEAM QTY, and generates aggregate Week 1 data without modifying the workbook or publishing participant names/IDs.

```sh
python scripts/import_week1.py '/path/to/LMS Week 1 Picks.xlsx'
node scripts/build_app.cjs
node --test tests/*.test.cjs
python -m http.server 8765
```

The build uses pinned Babel standalone 8.0.4 with the classic React runtime. An already downloaded copy can be provided as the build script's optional argument. Commit both `app.jsx` and regenerated `app.js` after UI changes. No deployment build or new Actions workflow is required.

Regression checks cover workbook reconciliation, the 2025 Week 11 reference, Week 16 double-counting, three-pick outcomes, CSV/Excel paste parsing, JSON imports, season migration, next-week numbering, ESPN aliases, missing scores, ties, manual overrides and storage failure. Live ESPN data must match the requested season, phase and week; missing matches produce a visible warning. Scores refresh once on selection and every 60 seconds, with in-flight requests canceled on selection changes.
