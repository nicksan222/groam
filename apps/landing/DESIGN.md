---
name: Groam Landing
description: The marketing site for Groam, where a group trip changes in real time on one shared record that people and AI agents both write.
colors:
  primary: "#2a6fdb"
  primary-hover: "#1f5fc7"
  primary-foreground: "#ffffff"
  primary-soft: "color-mix(in srgb, #2a6fdb 11%, #ffffff)"
  primary-ink: "color-mix(in srgb, #2a6fdb 80%, #2b2e38)"
  background: "#ffffff"
  canvas: "#f5f6f8"
  foreground: "#2b2e38"
  card: "#ffffff"
  muted: "#eff0f3"
  muted-foreground: "#5f6473"
  border: "#e3e5ea"
  input: "#d2d5dc"
  ring: "#2a6fdb"
  success: "#118c74"
  success-foreground: "#0b6b58"
  success-soft: "color-mix(in srgb, #118c74 14%, #ffffff)"
  warning: "#e0a050"
  avatar-sky: "color-mix(in srgb, oklch(0.68 0.14 235) 16%, oklch(0.96 0.01 265))"
  avatar-sky-foreground: "#164e63"
  dark-background: "#1a1b26"
  dark-canvas: "#13131a"
  dark-card: "#1c1d29"
  dark-foreground: "#c0caf5"
  dark-muted-foreground: "#9aa5ce"
  dark-border: "#2f3549"
  dark-primary: "#7aa2f7"
typography:
  display: {fontFamily: "Google Sans Flex Variable, ui-sans-serif, system-ui, sans-serif", fontSize: "clamp(2.5rem, 5.4vw, 4.5rem)", fontWeight: 600, lineHeight: 1.03, letterSpacing: "-0.035em"}
  headline: {fontFamily: "Google Sans Flex Variable, ui-sans-serif, system-ui, sans-serif", fontSize: "clamp(2.3rem, 5vw, 4rem)", fontWeight: 600, lineHeight: 1.04, letterSpacing: "-0.035em"}
  title: {fontFamily: "Google Sans Flex Variable, ui-sans-serif, system-ui, sans-serif", fontSize: "clamp(1.8rem, 3.4vw, 2.6rem)", fontWeight: 600, lineHeight: 1.1, letterSpacing: "-0.025em"}
  lede: {fontFamily: "Google Sans Flex Variable, ui-sans-serif, system-ui, sans-serif", fontSize: "1.05rem", fontWeight: 400, lineHeight: 1.55}
  body: {fontFamily: "Google Sans Flex Variable, ui-sans-serif, system-ui, sans-serif", fontSize: "16px", fontWeight: 400, lineHeight: 1.55, letterSpacing: "-0.011em"}
  entry: {fontFamily: "Google Sans Flex Variable, ui-sans-serif, system-ui, sans-serif", fontSize: "14px", fontWeight: 400, lineHeight: 1.45}
  label: {fontFamily: "Google Sans Flex Variable, ui-sans-serif, system-ui, sans-serif", fontSize: "14px", fontWeight: 500, lineHeight: 1}
  fine: {fontFamily: "Google Sans Flex Variable, ui-sans-serif, system-ui, sans-serif", fontSize: "13px", fontWeight: 400}
  time: {fontFamily: "Google Sans Code, ui-monospace, SFMono-Regular, monospace", fontSize: "12px", fontWeight: 500, lineHeight: 1.4, fontFeature: "tnum"}
rounded: {chip: "0.375rem", label: "6px", control: "0.5rem", detail: "8px", card: "0.875rem", full: "50%"}
spacing: {gutter: "clamp(20px, 5vw, 64px)", measure: "1240px", hero-gap: "clamp(32px, 5vw, 80px)", section: "clamp(64px, 9vw, 128px)", entry: "12px 18px"}
components:
  button-primary: {backgroundColor: "{colors.primary}", textColor: "{colors.primary-foreground}", typography: "{typography.label}", rounded: "{rounded.control}", height: "2.25rem", padding: "0 14px"}
  button-primary-hover: {backgroundColor: "{colors.primary-hover}"}
  button-primary-lg: {backgroundColor: "{colors.primary}", textColor: "{colors.primary-foreground}", rounded: "{rounded.control}", height: "2.75rem", padding: "0 18px"}
  button-outline: {backgroundColor: "{colors.background}", textColor: "{colors.foreground}", rounded: "{rounded.control}", height: "2.25rem", padding: "0 14px"}
  button-outline-hover: {backgroundColor: "{colors.muted}"}
  button-ghost: {backgroundColor: "transparent", textColor: "{colors.foreground}", rounded: "{rounded.control}", height: "2.25rem", padding: "0 14px"}
  chip: {backgroundColor: "{colors.muted}", textColor: "{colors.muted-foreground}", rounded: "{rounded.chip}", padding: "2px 8px"}
  chip-idea: {backgroundColor: "{colors.primary-soft}", textColor: "{colors.primary-ink}", rounded: "{rounded.chip}", padding: "2px 8px"}
  chip-agent: {backgroundColor: "{colors.avatar-sky}", textColor: "{colors.avatar-sky-foreground}", rounded: "{rounded.chip}", padding: "2px 8px"}
  chip-done: {backgroundColor: "{colors.success-soft}", textColor: "{colors.success-foreground}", rounded: "{rounded.chip}", padding: "2px 8px"}
  example-label: {textColor: "{colors.muted-foreground}", rounded: "{rounded.label}", padding: "2px 8px"}
  avatar: {rounded: "{rounded.full}", size: "24px"}
  avatar-agent: {backgroundColor: "{colors.avatar-sky}", textColor: "{colors.avatar-sky-foreground}", rounded: "{rounded.full}", size: "24px"}
  surface-card: {backgroundColor: "{colors.card}", textColor: "{colors.foreground}", rounded: "{rounded.card}"}
  activity-entry: {typography: "{typography.entry}", padding: "{spacing.entry}"}
  pause-control: {backgroundColor: "{colors.background}", textColor: "{colors.muted-foreground}", rounded: "{rounded.control}", size: "28px"}
---

# Design System: Groam Landing

## Overview

**Creative North Star: "The Trip On The Record"**

The marketing site is not a second brand. It is the Groam app's own world (white and canvas neutrals, Tokyo blue actions, the Tokyo Night dark ladder, quiet hairlines, compact rounded controls, one Google Sans Flex voice) turned outward to persuade. Every page proves its claim with the product at work: an example trip that changes while the visitor watches. The component language is the trip activity log. An avatar, an actor, a verb, an object block, and a mono timestamp make up one entry, and every demo on the site is built from that grammar.

The two pins of the Groam mark become the two kinds of author. Humans wear Catppuccin avatar tints (pink, green, mauve, peach). Agents wear the sky tint with a hairline inset ring, and their object blocks carry a faint sky wash. Blue is reserved for actions, the focus ring, and the brief settle that marks what just happened. Status colour appears only as a meaning: success for applied and closed, a removed-row tint for what an idea takes away.

Motion is narrative, not decoration. Loops move time forward, never reflow the page, pause off screen, in a hidden tab, and on demand, and come to rest on a finished, truthful still under reduced motion. Nothing on the site needs script to read correctly.

**Key Characteristics:**

- App tokens only, imported from `@groam/ui/styles/tokens`; the landing adds five derived roles and nothing else.
- One example trip, "Lisbon long weekend", labelled "Example trip" everywhere it appears.
- Feed entries (avatar, actor, verb, object block, mono time) are the reusable component language.
- Flat, hairline-bordered surfaces on white, with canvas bands for full-width interludes.
- One easing curve, `cubic-bezier(0.16, 1, 0.3, 1)`, for every eased transition and animation.
- System theme only: the `.dark` class follows `prefers-color-scheme` before first paint.

## Colors

The palette is the app's Tokyo Night system, inherited unchanged; the landing only mixes softer roles from it.

### Primary

- **Tokyo Blue** (#2a6fdb; Night blue #7aa2f7 in dark): primary buttons, links, focus ring, the pager's hover rule, the "now" settle on the newest feed entry, and the split-view divider. Never a section background.
- **Tokyo Blue Hover** (#1f5fc7): hover for primary buttons only.
- **Blue Wash** (`primary-soft`, primary at 11% over background, 18% in dark): the settle flash on an arriving entry, text selection, the Idea chip, and highlighted plan rows.
- **Blue Ink** (`primary-ink`, primary 80% into foreground): text on Blue Wash and the "now" timestamp.

### Secondary

- **Agent Sky** (`avatar-sky` with ink #164e63): agent avatars, the Agent chip, and agent object blocks (sky at 20% over card). It is the visual signature of an AI author and is never used for humans.

### Tertiary

- **Applied Green** (#118c74, ink #0b6b58, `success-soft` at 14%): the live dot, Applied and Closed chips, added rows in an idea diff. It means "agreed" and nothing else.
- **Catppuccin avatar tints** (pink, green, mauve, peach, plus per-trip tones in ribbons and lanes): one tint per human traveler, fixed by name (Maya pink, Jonas green, Priya mauve, Sam peach).

### Neutral

- **White** (#ffffff): page and card surface.
- **Soft Canvas** (#f5f6f8): full-bleed bands (the trip ribbon, the tracked-kinds section), object blocks inside entries, the legal draft notice.
- **Ink** (#2b2e38): headings and body.
- **Muted Ink** (#5f6473): ledes, verbs, fine print, timestamps.
- **Muted Surface** (#eff0f3): neutral chips, ghost and outline hover.
- **Hairline** (#e3e5ea): card borders, entry connectors, section dividers.
- **Input Stroke** (#d2d5dc): the dashed outline of example labels and draft notices.
- **Dark ladder**: canvas #13131a, page #1a1b26, card #1c1d29, border #2f3549, text #c0caf5 and #9aa5ce.

### Named Rules

**The Inherited Palette Rule.** Every colour is a `var(--token)` from `@groam/ui` or a `color-mix()` of two of them. No hex, rgb, or oklch literal appears in landing source.

**The Two Authors Rule.** Sky belongs to agents and the Catppuccin tints belong to humans. A visitor should be able to tell who wrote an entry from the avatar alone.

**The Blue Means Now Rule.** Blue marks the action to take or the thing that just changed. It fades back to neutral once the moment passes.

## Typography

**Display Font:** Google Sans Flex Variable (with ui-sans-serif, system-ui, sans-serif)
**Body Font:** Google Sans Flex Variable
**Label/Mono Font:** Google Sans Code, for timestamps and plan times only

**Character:** One self-hosted sans carries everything, set tight at display sizes (-0.035em) and at the app's -0.011em body tracking. The mono face appears only as time, so a glance at a row reads as a record.

### Hierarchy

- **Display** (600, clamp(2.5rem, 5.4vw, 4.5rem), 1.03): the home hero headline only.
- **Headline** (600, clamp(2.3rem, 5vw, 4rem), 1.04, max 18ch): the page intro `h1` on every subpage.
- **Title** (600, clamp(1.8rem, 3.4vw, 2.6rem), 1.1, max 20ch): section headings and the closing call.
- **Price figures** (600, clamp(4rem, 9vw, 6.5rem) to clamp(4.5rem, 11vw, 8.5rem)): the €0 / €1 figures and calculator total on pricing only.
- **Lede** (400, 1.05rem; hero sub clamp(1.05rem, 1.4vw, 1.2rem); max 38 to 52ch): one-paragraph support under a heading, in muted ink.
- **Body** (400, 16px, 1.55): page copy; legal prose sits in a 68ch column.
- **Entry** (400, 14px, 1.45; object block 13.5px): feed rows and demo rows. Actor 600, verb muted.
- **Label** (500, 14px; 15px on large buttons; chips 12.5px): buttons and chips.
- **Fine** (400, 13px, muted): reassurance lines under calls to action, captions, "Previous / Next".
- **Time** (Google Sans Code 500, 12px, tabular figures): every timestamp and plan time.

### Named Rules

**The Mono Is Time Rule.** Google Sans Code is used for clock times and day stamps (`Tue 09:03`, `13:30`) and for nothing else.

**The No Eyebrow Rule.** A heading stands alone. No uppercase kicker, tracking label, or category line sits above it.

## Layout

- **Container:** `.wrap` caps content at a 1240px measure plus gutters (`max-width: calc(1240px + 2 * gutter)`), centred, with a fluid gutter of clamp(20px, 5vw, 64px). Full-bleed bands (trip ribbon, tracked kinds, pricing lane) span the viewport and place a `.wrap` inside.
- **Home hero:** two equal columns with a clamp(32px, 5vw, 80px) gap. The copy column is sticky (top 32px); the activity card sits at the right. Below 900px it stacks and the copy unsticks.
- **Section rhythm:** sections breathe with fluid block padding, typically clamp(64px, 9vw, 128px) for major sections, clamp(32px, 6vw, 88px) above a page intro, and clamp(56px, 8vw, 112px) under a demo. Heading to lede is 14px; lede to content is about 40 to 48px.
- **Subpage frame:** nav, page intro (headline, lede, actions), signature demo in a `.wrap`, the page's own sections, then for feature pages a pager and the closing call, then the footer.
- **Feature pager:** a 1fr / 2fr grid. Previous is small; Next is large with icon, name, summary, and an arrow that slides 6px on hover. Below 640px it stacks with Next first.
- **Legal pages:** a dashed draft notice, then a 240px sticky table of contents beside a 68ch article. Below 880px the contents unstick and flow above the article as a wrapping grid.
- **Breakpoints in use:** 900px (hero), 880px (legal), 860px (nav menu); two-column demos stack at their own widths, 640px (pager, split-view buttons), 420px (activity entries move the time under the text). Phones keep a 20px gutter with no horizontal scroll.

## Elevation & Depth

Flat by default. Depth comes from white surfaces on canvas, one-pixel hairlines, and the app's quiet card shadow (`--shadow-card`: 0 2px 8px at 4% black in light, 15% in dark). Primary buttons carry `--shadow-xs`. The live dot gets a 3px halo ring of its soft tint. Agent avatars get a 1px inset ring of sky ink at 25%. Nothing floats higher; the mobile menu sheet reuses the surface card.

### Named Rules

**The Hairline Lift Rule.** A card is lifted by its border and the shared card shadow, never by a larger shadow, a glow, or a tinted slab.

## Shapes

Compact and gently rounded. Controls use the app radius (0.5rem). Chips use 0.375rem, example labels 6px, object blocks 8px, and surface cards a softer 0.875rem (`--radius-card`, the only landing radius). Avatars and the live dot are true circles. Borders are 1px and solid; a dashed 1px input-stroke border means "illustrative" (example labels, draft notices, proposed-but-not-applied rows). The closing call opens with a full-width 2px rule in foreground ink, the one heavy line on a page.

## Components

### Buttons

- **Shape:** rounded-lg (0.5rem), 1px border, 2.25rem tall at 14px/500; large is 2.75rem at 15px with 18px padding.
- **Primary:** Tokyo blue with white text and `--shadow-xs`. It always reads "Start a trip" and opens the web app; "Sign in" is the ghost variant.
- **Outline:** background with a hairline border, used for the secondary route ("See how it works", "See pricing", "See features").
- **Ghost:** borderless; nav Sign in and tertiary 404 links.
- **Hover / Focus:** 0.15s colour transitions; primary deepens to hover blue, outline and ghost take the muted surface. Focus is a global 2px ring outline at 2px offset.

### Chips

- **Style:** 2px by 8px, 0.375rem radius, 12.5px/500, optional 13px icon.
- **Variants:** neutral (muted), Idea (blue wash and blue ink), Agent (sky), Done / Applied (success soft and success ink). Colour carries meaning, never decoration.

### Avatars

- **Style:** 24px circles with a single initial at 11px/600, or a 14px pin glyph for agents. Human tints are fixed per traveler; agents use sky with a hairline inset ring.

### Cards / Containers

- **Corner Style:** 0.875rem.
- **Background:** card on background; full-bleed interludes use canvas with top and bottom hairlines.
- **Shadow Strategy:** hairline plus `--shadow-card` (see Elevation & Depth).
- **Header:** 12px by 18px, 13.5px, hairline underneath, holding live dot, bold trip name, muted context, and the example label pushed right.

### Activity Entry (signature)

The grammar every demo reuses. A three-column grid: 24px avatar, text, and a mono time (the time drops under the text below 420px). The text is the actor in 600, the verb in muted ink, and an optional object block on canvas (8px radius, 8px by 10px, 13.5px) that turns faint sky for agent authors. Consecutive entries are joined by a 2px hairline-coloured connector under the avatars. The newest entry is "now": its time turns blue ink and gains a "now ·" prefix.

### Example-trip labelling

Every illustrative surface carries the `.example-label`: 11.5px muted text in a 1px dashed input-stroke outline, 6px radius. Cards with a header place it right-aligned in the header; lists and lanes place it beside their controls ("Example trips"); demos without a header place it in the caption.

### Pause controls

Every self-running loop has a visible control, revealed by script only when the loop actually runs (it ships `hidden`). Compact form: a 28px square outline button with a 14px pause or play icon, `aria-pressed`, and a visually hidden label ("Pause activity"). Labelled form: icon plus text ("Pause the walkthrough", "Pause animation"). When paused, the live dot turns muted and the "now" settle dims to 35%.

### Navigation

Brand mark and wordmark at left, Features and Pricing as quiet links (with `aria-current`), then ghost Sign in and primary Start a trip. Below 860px the links and Sign in hide and a `<details>` menu opens a surface sheet listing all five features with their icons, Pricing, and Sign in; Escape and outside clicks close it. A skip link to `#content` precedes the nav. The footer is a canvas band with the mark, the "Plan together. Go further." line, and Features, Product, and Legal columns.

### Feature pager

Hairline-topped links, border turning blue on hover. Next shows the next feature's icon in blue, its name at clamp(1.5rem, 3.2vw, 2.4rem), and its one-line summary.

### Motion grammar

- **Easing:** `cubic-bezier(0.16, 1, 0.3, 1)` everywhere eased (exposed locally as `--ease`); plain `ease` only for 0.15 to 0.2s colour hovers; `linear` only for constant marquees.
- **Durations:** 0.6 to 0.8s for slides and reveals, a 1.6s blue settle on arriving rows, a 2.4s dwell between feed entries, 70s for ribbon and lane marquees.
- **Infinite loops** run only while on screen (IntersectionObserver), while the tab is visible, and while not paused by their control.
- **No layout shift:** the feed reserves the height of its tallest run of visible entries in a fixed clip and slides the list inside it; marquees translate a duplicated track; rows glide from their old place (FLIP) rather than reflow.
- **Forward-only time:** recycled entries are restamped later than the last one, kept between 08:00 and 23:30 and rolling to the next morning.
- **Reduced motion:** smooth scrolling is off, nothing autoplays, and each demo rests on its finished, truthful state (the idea Applied, answers shown whole, the full log). Controls still work. Without script the same stills render.

### Page inventory

| Page | Signature loop | Interaction |
| --- | --- | --- |
| `/` | Hero activity log for "Lisbon long weekend": a new entry arrives every 2.4s with a blue settle; then a marquee ribbon of other example trips | Pause the log and the ribbon; step through Propose, Review, Apply on the Sintra idea (buttons and arrow keys) |
| `/features/` | Hub explorer: one list, one live preview, auto-advancing with a progress bar | Hover, focus, or click selects; holds while pointer or focus is inside; pause |
| `/features/itinerary/` | A time cursor sweeps each day, rows light as it passes, then the next day's activities slide into their slots | Switch days, flip Saturday Before and After, drag or arrow-key the cursor, reorder with move buttons, scrub the whole-trip timeline |
| `/features/ideas/` | The idea card cycles Proposed, Changes requested, Applied; the live plan beside it turns solid only at Applied | Take over the steps, Approve or Request changes (pauses), Play resumes; drag a split divider between live plan and "with this idea" (buttons below 640px) |
| `/features/issues/` | Loose ends arrive, an idea is linked and applied, and the issue checks itself off into Closed, then crossfades back | Apply the idea yourself; switch Open and Closed tabs |
| `/features/conversations/` | Trip chat beside Saturday's plan: messages, replies, and reactions arrive and light the plan row they discuss | React, fold threads, pause |
| `/features/ai/` | Questions type in, the agent's answer streams, and the rows it cites light up, across three screens | Pick a screen or a question; pause |
| `/pricing/` | Marquee lane of example trips where only a traveler's first trip carries €1 | Price calculator: steppers and ranges for invited and already-covered travelers drive a rolling total and live sentence; FAQ disclosures |
| `/privacy/`, `/terms/` | None | Draft notice, sticky contents, anchored sections |
| `404` | A pin walks a dotted route that bends back on itself and never arrives, with a "still looking" log | Pause animation; Back to home, See features, Pricing |

### The canonical example trip

`src/content/example-trip.ts` is the single source for every Lisbon demo: "Lisbon long weekend", Fri 14 to Sun 16 Nov, organised by Maya with Jonas, Priya, and Sam; the agreed plan; Maya's idea "Swap Belém for Sintra" with its removals, additions, agent note, clash check, and applied time; Saturday after; and three loose-end issues with the idea that closes each. A demo may stage this data at a different moment but never contradicts it. Secondary trip names (ribbon, pricing lane) are lists, labelled "Example trips", and never have their own plan.

## Do's and Don'ts

### Do:

- **Do** take every colour from `@groam/ui` tokens or a `color-mix()` of them, and add landing-only roles to `src/styles/landing.css` `:root` and `.dark`.
- **Do** build demos from the activity-entry grammar: avatar, actor, verb, object block, mono time.
- **Do** draw Lisbon demo data from `src/content/example-trip.ts` and label every illustrative surface "Example trip" or "Example trips".
- **Do** give every infinite loop a visible pause control and stop it off screen and in a hidden tab.
- **Do** keep feed time moving forward and reserve space so no loop shifts layout.
- **Do** ship a finished, truthful still under `prefers-reduced-motion` and without script.
- **Do** use `cubic-bezier(0.16, 1, 0.3, 1)` for eased motion.
- **Do** write internal hrefs with a trailing slash (`/features/`, `/pricing/`, `/features/ideas/`).
- **Do** say "idea" for a suggested change and "traveler" for a person on a trip; "Start a trip" for the primary action.

### Don't:

- **Don't** use gradients anywhere, on backgrounds, text, or borders.
- **Don't** put an eyebrow, kicker, or uppercase label above a heading.
- **Don't** number sections (01, 02, …) or headings.
- **Don't** use a coloured side rule thicker than 1px on a card, row, or list item.
- **Don't** write a hex, rgb, or oklch literal outside the token files.
- **Don't** market open source, GitHub, or self-hosting; licensing is undecided.
- **Don't** invent claims: no customer logos, user counts, ratings, or prices beyond the published free planning and €1 per invited traveler, once.
- **Don't** say "proposal", "member", or "user" in visible copy.
- **Don't** introduce a second typeface, a serif display face, or a feature-card grid under a screenshot hero.
