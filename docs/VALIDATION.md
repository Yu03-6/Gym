# Validation and remaining scope

Validated on 2026-09-16.

- 11 domain and storage tests passed: energy/macronutrient calculations, portions, snapshots, training volume, backup validation, rollback, and concurrent writes.
- Three browser scenarios passed in both Chromium and WebKit: mobile profile/food/workout/backup journeys, responsive layouts, and explicit nutrition-phase activation with historical isolation.
- TypeScript checking and the static production build passed.
- Chromium production offline reload and subsequent local edits passed.
- WebKit reopened the cached production app after its origin server was stopped. Playwright's `setOffline(true)` reload instead produced an internal WebKit navigation error; that emulation scenario is not claimed as passing.
- No physical iPhone was tested. Installation, storage persistence, and offline behavior on physical devices remain to be checked.

## Remaining scope

Verified influencer protocols require source material. Custom phased targets and source notes are available now; no influencer rules are invented. Automatic progressive overload, adaptive TDEE calibration, and target repetition ranges are not implemented. All records are local to the browser; cloud synchronization is intentionally excluded from this version.

GitHub Pages serves application files only. JSON exports are the recovery mechanism; users should save backups outside the browser regularly.

## Published-site checks

GitHub Actions successfully tested, built, and deployed https://yu03-6.github.io/Gym/. Chromium checks against that production URL passed for the full journal/backup journey, responsive layouts, nutrition phases, and offline reload with further local edits. The reload test waits for the committed completion indicator before navigation; clicking a control alone does not establish that an asynchronous IndexedDB write has finished. The clean mobile landing page returned HTTP 200 with no page errors.


## FitGo UI refresh

The static production build and 11 data/storage tests passed, including legacy Gym backup import and FitGo backup round trips. Chromium passed the journal, layout, phase, keyboard-dialog, and offline scenarios. WebKit passed the journal, layout, phase, and keyboard-dialog scenarios. Mobile screenshot review covered the first-run dashboard and settings sheet. Physical iPhone verification remains outstanding.

## Task-focused navigation revision

Production static export and TypeScript compilation passed. Chromium passed seven browser scenarios including direct entry, browser Back, library reload, meal-specific intake, food creation return, single-exercise training, and saved sets across navigation. WebKit passed the six online scenarios. Eight screens were checked at widths 360, 390, and 844 px without horizontal overflow. Screenshots were inspected for mobile dashboard, diary, training hub, body trends, and a populated dashboard in an isolated test browser. No physical iPhone was used.
