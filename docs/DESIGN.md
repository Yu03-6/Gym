# Gym design system

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
- Dialogs use native modal focus handling, scrolling, and Escape support.
- Charts expose readable underlying values and never use color as the only label.
- Respect reduced motion; preserve browser zoom and bottom safe areas.

## Product exclusions

No recipe generation, weekly meal plans, shopping lists, social feed, paid subscription, or invented influencer protocols.
