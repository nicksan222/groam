---
name: Groam
description: A calm shared workspace where people and agents turn trip ideas into agreed plans.
colors:
  primary: "#2a6fdb"
  primary-hover: "#1f5fc7"
  background: "#ffffff"
  canvas: "#f5f6f8"
  foreground: "#2b2e38"
  card: "#ffffff"
  muted: "#eff0f3"
  muted-foreground: "#5f6473"
  accent: "#eceef3"
  border: "#e3e5ea"
  input: "#d2d5dc"
  ring: "#2a6fdb"
  destructive: "#f52a65"
  success: "#118c74"
  warning: "#e0a050"
  info: "#3b82f6"
typography:
  display: {fontFamily: "Google Sans Flex Variable, ui-sans-serif, system-ui, sans-serif", fontWeight: 600}
  body: {fontFamily: "Google Sans Flex Variable, ui-sans-serif, system-ui, sans-serif", fontWeight: 400}
  label: {fontFamily: "Google Sans Flex Variable, ui-sans-serif, system-ui, sans-serif", fontWeight: 500}
  mono: {fontFamily: "Google Sans Code, ui-monospace, SFMono-Regular, monospace"}
rounded: {default: "0.5rem", button: "0.5rem", badge: "0.375rem"}
spacing: {base: "0.25rem"}
components:
  button-primary: {backgroundColor: "{colors.primary}", textColor: "#ffffff", rounded: "{rounded.button}", height: "2rem", padding: "0 0.75rem"}
  button-secondary: {backgroundColor: "{colors.muted}", textColor: "#2b2e38", rounded: "{rounded.button}", height: "2rem", padding: "0 0.75rem"}
  card: {backgroundColor: "{colors.card}", textColor: "{colors.foreground}", rounded: "{rounded.default}", padding: "1rem"}
---

# Design System: Groam

## Overview

**Creative North Star: "The Shared Trip Table"**

Groam is a refined, calm workspace for people and AI agents planning together. The visual language is shadcn-style and all-sans: white and soft neutral light surfaces, a Tokyo Night indigo dark hierarchy, quiet hairlines, restrained actions, and compact rounded controls keep attention on the itinerary and reviewable collaboration. The Groam brand mark remains available for applicable brand and authentication surfaces; the workspace sidebar begins with the group switcher.

The approved trip direction uses a left sidebar, panoramic trip cover, compact navigation, and an assistant dock at the right on wide screens that overlays smaller screens. The approved reference is `apps/web/.impeccable/mocks/approved-trip.png`; it is a direction reference, not proof of visual QA.

**Key Characteristics:**

- Human and agent collaboration is legible in one shared workspace.
- Tokyo blue primary actions lead in light mode; Night blue remains the action color in dark mode.
- Typography is compact, neutral, and entirely sans-serif.
- Depth comes from tonal layering, hairline borders, and restrained shadows.

## Colors

The palette follows Tokyo Night. Light mode keeps white surfaces on near-neutral slate (Tokyo Night Day hues, desaturated so text and hairlines stay quiet), with blue actions and a magenta and cyan pop on the auth aura. Dark mode uses the Tokyo Night indigo ladder with Night blue reserved for actions and focus.

### Primary

- **Tokyo Blue** (#2a6fdb): Primary actions, selection, focus ring, and shared-work affordances. A shade deeper than Day blue (#2e7de9) so white button text clears AA.
- **Tokyo Blue Hover** (#1f5fc7): Hover state for primary actions.
- **Magenta / Cyan** (#9854f1 / #7dcfff): Pop stops on the auth aura only; never for text on white.

### Neutral

- **White** (#ffffff): Page, card, input, and popover surfaces.
- **Soft Canvas** (#f5f6f8): Workspace canvas behind content.
- **Ink** (#2b2e38): Main text and headings.
- **Muted Surface** (#eff0f3): Secondary controls and quiet grouping.
- **Muted Ink** (#5f6473): Supporting and sidebar text.
- **Soft Accent** (#eceef3): Tinted interaction surface.
- **Hairline** (#e3e5ea): Dividers and card borders.
- **Input Stroke** (#d2d5dc): Form control borders.

### Named Rules

**The Shared Table Rule.** Keep agreed information easy to scan; proposed changes and private assistance should be visually distinct without creating separate visual worlds.

## Typography

**Display Font:** Google Sans Flex Variable (with ui-sans-serif, system-ui, sans-serif)

**Body Font:** Google Sans Flex Variable (with ui-sans-serif, system-ui, sans-serif)

**Label/Mono Font:** Google Sans Code for code and technical values.

**Character:** One bundled sans voice keeps headings and body copy coherent; no substitute display or serif face is introduced.

### Hierarchy

- **Display:** Google Sans Flex Variable, weight 600; major workspace titles where a display scale is defined.
- **Headline / Title:** Google Sans Flex Variable, weight 600; page, card, and section headings.
- **Body:** Google Sans Flex Variable, weight 400; itinerary, descriptions, and conversation content.
- **Label:** Google Sans Flex Variable, weight 500; controls, tabs, metadata, and badges.
- **Code:** Google Sans Code; code, keyboard hints, and technical values.

## Layout

Desktop uses a left sidebar and flexible content canvas. The shared sidebar is 16rem expanded, 3rem in icon mode, and 18rem as the mobile sheet. Trip detail places breadcrumb and compact title over a panoramic cover, followed by tabs, a read-only notice, and the day planner. Private assistance docks right at wide (`xl`) layouts and overlays smaller screens. Use the 0.25rem spacing base and shared compact control heights.

### Dashboard

The implemented dashboard is action-first. The header action and empty state use the existing Create trip dialog directly. When populated, Needs your attention shows at most three reviews; Recent ideas shows a distribution based on up to the 25 most recent proposals and is hidden when empty. Continue planning shows at most four compact cover-or-fallback rows with dates, destination, next action, and nonzero outstanding counts, beside Your ideas with at most four drafts or conflicts. Recently decided shows at most four items. On mobile the desktop two-column planning area stacks vertically.

## Elevation & Depth

Tonal layering and borders establish hierarchy; small shadows support controls and transient surfaces. Cards are white with a border, while popovers and dialogs may use larger shared shadows. Dark mode uses the Tokyo Night ladder: inset canvas `#13131a`, sidebar `#16161e`, page `#1a1b26`, card `#1c1d29` (a hairline-bordered lift, not a tinted slab), transient overlay `#24283b`, muted control surface `#292e42`, selection surface `#283457`, foreground `#c0caf5`, muted foreground `#9aa5ce`, and border `#2f3549`. Night blue is reserved for primary actions, primary text, and focus rings (`#7aa2f7`); intermediate surfaces stay tinted neutral. Dialogs, alert dialogs, sheets, menus, and popovers share the elevated overlay surface; the scrim is `#000000cc`. The dark auth aura uses Tokyo Night storm stops ending in deep blue `#3d59a1`.

### Shadow Vocabulary

- **Control:** `0px 1px 2px 0px hsl(0 0% 0% / 0.05)` (`--shadow-xs`).
- **Small surface:** `0px 1px 3px 0px hsl(0 0% 0% / 0.08), 0px 1px 2px -1px hsl(0 0% 0% / 0.08)` (`--shadow-sm`).
- **Card:** `0 2px 8px rgb(0 0 0 / 4%)` (`--shadow-card`).

## Shapes

The base radius is 0.5rem. Buttons and inputs use rounded-lg; badges use rounded-md (0.375rem). Borders are quiet and generally one pixel. Buttons are 2rem default, 1.75rem small, and 2.25rem large; inputs are 2.25rem high. Avoid pill silhouettes unless an existing component API calls for them.

## Components

### Buttons

- **Shape:** Rounded-lg (0.5rem), one-pixel border, compact height.
- **Primary:** Tokyo blue with high-contrast text, `2rem` high and `0 0.75rem` padding; hover uses Tokyo blue hover.
- **Hover / Focus:** Color transition; 2px blue focus ring with 1px offset; active removes small shadow.
- **Secondary / Ghost / Tertiary:** Secondary is muted with input border; outline uses page background; ghost is borderless with muted hover; link underlines on hover.

### Chips

- **Style:** Rounded-md, 0.375rem, `0.5rem` horizontal and `0.125rem` vertical padding. Semantic variants use restrained tinted status colors.
- **State:** Reserve semantic colors for status rather than decoration.

### Cards / Containers

- **Corner Style:** Rounded-lg (0.5rem).
- **Background:** Card white on canvas; dark mode uses dark card surface.
- **Shadow Strategy:** Prefer border and tonal separation; lift only with shared small/card shadows.
- **Border:** `var(--border)` for default cards.
- **Internal Padding:** 1rem compact, 1.5rem at medium widths.

### Inputs / Fields

- **Style:** 2.25rem high, full width, rounded-lg, input border, page background, control shadow.
- **Focus:** Blue border and 3px translucent blue ring.
- **Error / Disabled:** Destructive border/ring for invalid fields; disabled fields are non-interactive and reduced in opacity.

### Navigation

The sidebar begins with the group switcher and uses a muted surface and foreground. Dark active navigation uses a tinted neutral surface; blue remains reserved for actions and focus. Desktop supports off-canvas and icon collapse; mobile uses a sheet. Trip navigation uses compact breadcrumbs and tabs above the planner.

### Assistant Dock

Private contextual help uses a Cloudflare-inspired sidechat pattern: a header shows the active conversation title and opens chat history, with controls for new chat, widening, and closing. At viewports 1280px and wider it docks at 24rem by default and can widen to 40rem, capped at 40vw. Below 1280px it is an accessible sheet; on phones it fills the viewport height with safe-area padding. A quiet context bar sits above one composed input with attachments, stop/send states, and the AI notice. The controlled draft survives layout changes and thread selection. Its controls use the same all-sans, neutral-surface language as the workspace.

## Do's and Don'ts

- **Do** use the Groam brand mark on applicable brand and authentication surfaces, and preserve the Tokyo blue primary role.
- **Do** keep agreed plans, proposed ideas, and private assistance understandable.
- **Do** use shared UI primitives and semantic color tokens.
- **Do** preserve compact rounded controls and quiet hairlines.
- **Don't** introduce a serif display face, second visual brand, or unverified type metrics.
- **Don't** turn illustrative mockup data into product truth.
- **Don't** let the assistant compete with or obscure the itinerary.
- **Don't** claim visual QA is complete from the mockup alone.
