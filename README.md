# FitGo

A mobile-first nutrition and strength-training journal. Built with Next.js, React, TypeScript, Zod, and IndexedDB. All personal records remain in the current browser. No analytics, account, or application backend is required.

## Features

- Adult Mifflin–St Jeor energy estimates and editable macro targets.
- Custom food library with raw/cooked state and per-100g or per-100ml nutrition.
- Daily intake logging, portion editing, copying, and immutable food snapshots.
- Manually activated nutrition phases with separate training/rest targets and source notes.
- Workout templates, calendar scheduling, custom exercises, per-set logging, warmup sets, rest timers, interruption recovery, and history correction.
- Weight/waist records, seven-day weight averages, intake and exercise history.
- Complete validated JSON backup/replace-restore and CSV analysis export.
- Installable PWA and offline app-shell caching after a successful online visit.

There is no recipe generator, weekly menu, or shopping list. Influencer-specific plans are not invented or preloaded; source material must be reviewed before entering rules.

## Development

Use Node.js 22+ and pnpm 11.19.0.

```sh
pnpm install
pnpm dev
pnpm test
pnpm run typecheck
pnpm exec playwright install chromium
pnpm exec playwright test
```

For GitHub Pages project hosting:

```sh
NEXT_PUBLIC_BASE_PATH=/Gym pnpm build
```

The generated `out/` directory is static. `.github/workflows/pages.yml` tests, builds, and deploys it using GitHub Actions. Change the base path when renaming the repository.

## Persistence and safety

IndexedDB writes are transactional and validated. Records are isolated by browser origin. Cross-tab writes read the latest committed state, and BroadcastChannel refreshes other tabs. Template archive preserves completed and active sessions. Nutrition/food/exercise snapshots preserve historical values.

Local storage can be cleared by the browser or user. Export a JSON backup regularly and before changing devices or browsers. The persistence permission is a request, not a backup guarantee. CSV exports are for analysis and do not restore the entire application.

JSON import validates the version, types, finite numeric bounds, dates, unique IDs, relationships, and completed sets before an atomic replacement. A pre-restore backup download is initiated; the user should confirm it was saved.

Service workers do not guarantee background timers or alarms. Rest timing is based on an absolute end timestamp and resumes correctly when the page returns.

## Scope of calculations

Energy expenditure is estimated, not measured. The default activity multiplier includes training and does not add exercise calories again. Optional net exercise entries affect estimated expenditure only, not the food target. Logged weight does not automatically rewrite targets. Very-low-calorie plans are not supported. Special medical nutrition needs require individual guidance.

Formula source: Mifflin et al. (1990), https://pubmed.ncbi.nlm.nih.gov/2305711/.

## Project provenance

This application was implemented independently after researching wger, OpenNutriTracker, Liftosaur, and Ryot. No source code, exercise images, branded assets, or datasets from those applications were copied. Third-party package licenses remain with their authors. See `docs/DESIGN.md` for UI/UX decisions.
