---
version: 1
slug: "settings-settings-shell-settings-view-tsx-fb69651e"
primary_target: "apps/web/src/features/settings/settings-shell/settings-view.tsx"
related_targets: []
---

# Settings workspace

Mode: Operate. Scope: Profile, Appearance, Group, Security, and AI settings.
User approved the left-hand desktop menu, compact mobile navigation, and matching forms. Subsequent feedback requires existing page scale, no centered containers, no cards, and a simpler mobile section picker. Preserve current account operations, permission rules, routes, and the shared design system. Implement directly in the existing app.

## Direction contract

THESIS: One predictable settings workspace; every section shares a readable form column and action rhythm.

OWN-WORLD: Inherit current semantic tokens, bundled sans typography, compact shared controls, quiet borders, and light/dark surfaces. No global palette changes.

STORY: Choose a section, understand its scope, edit a setting, and find its action beneath the relevant fields. Personal settings stay independent of the active group.

FIRST VIEWPORT: A compact Settings header, a ten-rem desktop menu, and a full-width content column. The section title and description precede flat sections with dividers. Profile and group show compact identity rows. Mobile uses a single section picker instead of an icon row. Security flows from sign-in methods through recovery and password to sessions.

FORM: User-confirmed settings workspace, implemented directly without a concept roll or image comp. The signature interaction is the persistent active-section marker in desktop navigation and current selection in the mobile picker.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Finish evidence

Independent finish review: ship, with no material fixes on supplied desktop/mobile and light/dark captures. Existing design system reviewed and preserved; global sidecar/token drift was not repaired in this settings change. No raster assets were introduced.

Verification: 135 settings/member-management tests and six shared settings-component tests pass. Web/UI typechecks, focused formatting/lint, convention checks, and diff whitespace checks pass. The full repository quality suite was not run.

## Content refinement

Keep the accepted side navigation. At wide sizes, each flat section places its explanation in an eleven-rem column and aligns its controls to the right; narrow screens stack both. Profile name fields share a row where space permits. Section dividers replace repeated footer rules. Full-width page geometry and existing control sizes remain authoritative. Focused tests and web/UI typechecks were rerun after this refinement.

Profile refinement after user feedback: one flat form with a photo row and aligned labels/controls replaces the redundant Personal information heading and preview identity details. The extra header avatar is hidden on Profile. Existing sidebar, field behavior, sizes, and save semantics remain unchanged. Desktop/mobile inspection, seven focused tests, lint, and web typecheck pass.
