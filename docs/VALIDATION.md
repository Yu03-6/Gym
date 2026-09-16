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
