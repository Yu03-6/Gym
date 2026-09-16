# FitGo design system

## Direction

Mobile-first personal nutrition and strength journal. A warm, quiet working surface with athletic typography, dark olive text, orange primary actions, and botanical green training feedback. No stock photographs, generated meals, decorative charts, or demonstration records.

## Skill inputs

UI/UX Pro Max searches: `fitness tracking mobile dashboard`, `personal analytics dashboard`, `mobile touch form validation` (UX), and `static export client state` (Next.js).

The fitness search supplied the athletic Barlow type direction and orange/green palette. Its marketing hero and gamification recommendations did not fit a personal working surface and were not adopted. The second search confirmed dashboard hierarchy but also returned a marketing layout, which was not persisted as a verified product blueprint. Layout decisions follow the skill's mobile navigation, touch, validation, contrast, and reduced-motion guidance.

## Rules

- Four bottom tabs: Today, Nutrition, Training, Trends. Settings is secondary.
- At least 44 CSS px for principal controls, 48 px form controls, 16 px inputs.
- Warm white surfaces, subtle borders, 4/8 px spacing rhythm, restrained 150–220 ms feedback.
- No data at first launch. Useful empty states lead into real creation flows.
- Body metrics and targets are separate. Immutable snapshots protect previous records.
- Desktop uses a sidebar and two-column layout; mobile is the primary acceptance target.
- Dialogs use Radix Primitives for focus containment, Escape dismissal, scroll locking, accessible names, and nested layers. Keyboard focus returns to the previous active control.
- Charts expose readable underlying values and never use color as the only label.
- Respect reduced motion; preserve browser zoom and bottom safe areas.

## Product exclusions

No recipe generation, weekly meal plans, shopping lists, social feed, paid subscription, or invented influencer protocols.


## FitGo refresh

The taste-skill redesign-preserve protocol was applied to the existing product: retain the four destinations, source data, orange actions, warm neutral surface, and olive feedback. Existing large empty cards, repeated decorative eyebrows, and equal visual weighting were reduced. DESIGN_VARIANCE 4, MOTION_INTENSITY 2, VISUAL_DENSITY 5. Landing-page-specific recipes were not applied to this working journal.

- A dark olive energy card prioritizes the daily energy balance. Secondary nutrition and training surfaces remain light.
- Manrope variable Latin text and numbers come from the official Fontsource package and are self-hosted through next/font/local. Chinese text retains the platform font stack. Only the Latin WOFF2 subset is bundled; no external font requests are required.
- Official @radix-ui/react-dialog provides behavior while project CSS defines the mobile sheet and desktop modal appearance. Existing Lucide icons are retained.
- Cards use 18–20 px corners, controls 10–12 px corners, and round progress rings. Motion is restrained and respects reduced-motion settings.
- The public name, metadata, installation manifest, and new export filenames use FitGo. Existing IndexedDB identifiers, URL, and service-worker cache family remain stable. Both Gym and FitGo backup envelopes can be restored.

Radix Primitives and Fontsource are package dependencies, not standalone installed SKILL.md files. The taste-skill source is the locally available design-taste-frontend skill.

## Task-focused mobile structure

The dashboard contains a combined energy/macro overview, direct food/weight creation actions, and a compact training status. Phase management, extended charts, and template maintenance live on separate screens. The week selector is disclosed on demand.

- Nutrition defaults to the daily diary. The food library and phased plans are separate hash routes with a visible parent link. Meal-specific entry preserves the meal selection. Food entry first selects a food, then shows portion and meal fields; adding a food returns to the same intake draft.
- Training defaults to a start/resume hub and today's schedule. Templates and history have their own screens. An active session displays one exercise with a selector and previous/next controls. Set data is committed independently of navigation. Notes are disclosed on demand.
- Trends switches between body, nutrition, and strength. Additional activity estimates are nested under nutrition trends.
- Hash routes allow direct links, reload recovery, and browser Back without a server router. Existing primary hashes and IndexedDB identifiers remain valid. Route changes restore the page heading focus without stealing focus from an open dialog.
- Mobile intake actions stay above bottom navigation; compact landscape layouts return them to normal flow. Principal controls retain 44 px touch targets. No sample records are inserted into user storage.
