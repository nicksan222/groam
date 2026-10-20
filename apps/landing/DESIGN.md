---
name: Groam Landing
description: The trip is a printed tour bill; an idea is a yellow strip pasted over it, and it sticks only when someone applies it.
colors:
  bill: "#1f45d4"
  bill-deep: "#1636a8"
  bill-ink: "#f4f4ef"
  paper: "#f1f1ec"
  paper-raised: "#fafaf7"
  ink: "#101318"
  ink-soft: "#474c58"
  strip: "#ffd23f"
  strip-deep: "#f2b705"
  strip-ink: "#16130a"
  agent: "#94d6ff"
  agent-ink: "#0a3954"
  done: "#127a52"
  gone: "#b3263a"
  tint-maya: "#ff9ab8"
  tint-jonas: "#79d394"
  tint-priya: "#bda4ff"
  tint-sam: "#ffb276"
typography:
  display:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(3.4rem, 8.2vw, 8.4rem)"
    fontWeight: 850
    lineHeight: 0.86
    letterSpacing: "-0.012em"
    fontVariation: "'wdth' 62"
  headline:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.6rem, 6.4vw, 5.6rem)"
    fontWeight: 850
    lineHeight: 0.88
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 64"
  title:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 2.2vw, 2rem)"
    fontWeight: 850
    lineHeight: 1
    fontVariation: "'wdth' 64"
  body:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.55
    fontVariation: "'wdth' 100"
  label:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 750
    lineHeight: 1
    letterSpacing: "0.04em"
    fontVariation: "'wdth' 86"
  time:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 650
    lineHeight: 1.4
    letterSpacing: "0.01em"
    fontFeature: "'tnum' 1"
    fontVariation: "'wdth' 82"
rounded:
  none: "0px"
  pill: "50%"
spacing:
  gutter: "clamp(16px, 4.5vw, 64px)"
  measure: "1320px"
  section: "clamp(72px, 10vw, 152px)"
  rule: "3px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0 16px"
    height: "2.5rem"
  button-primary-on-bill:
    backgroundColor: "{colors.bill-ink}"
    textColor: "{colors.bill}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0 16px"
    height: "2.5rem"
  button-primary-on-ink:
    backgroundColor: "{colors.strip}"
    textColor: "{colors.strip-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0 16px"
    height: "2.5rem"
  button-large:
    typography: "{typography.label}"
    padding: "0 26px"
    height: "3.5rem"
  surface:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
  strip:
    backgroundColor: "{colors.strip}"
    textColor: "{colors.strip-ink}"
    rounded: "{rounded.none}"
  chip-idea:
    backgroundColor: "{colors.strip}"
    textColor: "{colors.strip-ink}"
    rounded: "{rounded.none}"
    padding: "3px 8px"
  chip-agent:
    backgroundColor: "{colors.agent}"
    textColor: "{colors.agent-ink}"
    rounded: "{rounded.none}"
    padding: "3px 8px"
  avatar-agent:
    backgroundColor: "{colors.agent}"
    textColor: "{colors.agent-ink}"
    rounded: "{rounded.pill}"
    size: "26px"
  loop-toggle:
    rounded: "{rounded.none}"
    size: "36px"
---

# Design System: Groam Landing

## Overview

**Creative North Star: "The Tour Bill"**

The marketing site is a printed tour bill for one trip. Pages alternate between drenched cobalt bill fields and cool poster paper, and every page closes on an ink bill. The plan is printed in heavy condensed capitals and tabular timetable figures. An idea is a yellow strip pasted over the rows it would change: while it is proposed it sits lifted, tilted, and dashed at its paste edge; once someone applies it, it presses flush and becomes part of the bill. That paste is the reusable signature, and every demo on the site is a variation of it.

Each viewport has one dominant printed object (a pile of day bills, a timetable, a price figure, a board) and the copy rides on it. State is drawn, not coloured: a dashed edge means proposed or illustrative, a flush strip means applied, a 3px rule means structure. Colour carries meaning only. Yellow is ideas and change, sky is agents, four flat poster inks are the four example travelers, green is done, red is what an idea removes. The landing owns this world; the web app keeps its own system, and the app's shared tokens are remapped onto bill roles so shared components print in it too.

Motion is calm and physical. Sheets turn over, strips slide in and press down, labels crossfade in place, rows rise. One easing curve does all of it. Loops run only while visible and on demand, never shift layout, and rest on a finished, truthful still under reduced motion and without script.

**Key Characteristics:**

- Cobalt bill fields, poster paper, and an ink bill to close; no gradients anywhere.
- One family, Archivo Variable, used on its width axis: condensed heavy caps to display, normal width to read, tabular figures for every time and price.
- Yellow paste-over strips for ideas: lifted, tilted, and dashed while proposed; flush when applied.
- Square corners, 3px printed rules, and one `--lift` shadow that belongs to proposed strips.
- One example trip, "Lisbon long weekend", labelled "Example trip" everywhere it appears.
- System theme only: the `.dark` class follows `prefers-color-scheme` before first paint.

## Colors

Three printed grounds (cobalt, paper, ink) and a small set of flat poster inks that each mean one thing.

### Primary

- **Tour Bill Cobalt** (`bill`): the full-bleed bill fields (hero, page intros, record section, calculator, bands) and the nav masthead. On paper it becomes a figure or text colour (`bill-text`, lifted to #8ea6ff at night so it holds contrast). Cobalt is a ground first, an accent second.
- **Bill Deep** (`bill-deep`): pressed cobalt for primary hover in shared components.
- **Bill Ink** (`bill-ink`): everything printed on cobalt: headings, copy, rules, and the inverted primary button. Softer roles mix it into cobalt: `bill-soft` (74%) for ledes and fine print, `bill-line` (34%) for hairlines on the bill.

### Secondary

- **Paste-Strip Yellow** (`strip`, with `strip-ink` for text and `strip-deep` for pressed edges): ideas and changes only. The paste-over strip, the Idea chip, the strip tab, text selection, the skip link, and the primary button on the ink bill. When yellow appears, something is being proposed or the visitor is being asked to act on the closing bill.

### Tertiary

- **Agent Sky** (`agent`, ink `agent-ink`): agent avatars (with a 1.5px inset ring of agent ink), the Agent chip, and agent-authored blocks. Never used for a person.
- **Traveler poster inks** (`tint-maya` pink, `tint-jonas` green, `tint-priya` violet, `tint-sam` orange, all on `tint-ink`): one flat tint per example traveler, fixed by name.
- **Done Green** (`done`): Applied and Closed states, the done chip, checks. Means "agreed" and nothing else.
- **Gone Red** (`gone`, wash `gone-soft`): rows an idea removes.

### Neutral

- **Poster Paper** (`paper`): page ground, day sheets, the footer.
- **Raised Paper** (`paper-raised`): `.surface` panels and cards printed on any ground.
- **Ink** (`ink`): text on paper, 2px panel frames, 3px rules, the closing ink bill, and the primary button on paper.
- **Soft Ink** (`ink-soft`): ledes, verbs, captions, times. `ink-line` (16% ink into paper) draws row dividers.
- **Night** (`.dark`): paper goes to #0f1116 / #171a21 and ink to #ecede7; the bill and the strip stay printed, so a cobalt field still reads as cobalt at night.

### Named Rules

**The Printed Inks Rule.** Raw colour values live only in `src/styles/tokens.css`. Every other landing style reads a role (`var(--bill)`, `var(--strip)`) or a `color-mix()` of two roles.

**The Yellow Is Change Rule.** Yellow marks an idea or a change in flight. If nothing is proposed, nothing is yellow (the closing CTA on the ink bill is the one deliberate exception).

**The Two Authors Rule.** Sky belongs to agents and the four poster inks belong to people. A visitor can tell who wrote an entry from the avatar alone.

**The Grounds Set The Ink Rule.** A section declares its ground (`.bill`, `.bill-ink`, `.surface`, `.strip`), and the ground sets `--on`, `--on-soft`, `--on-line`, and the CTA pair. Components read those, never a fixed colour, so the same button and rule print correctly on any ground.

## Typography

**Display Font:** Archivo Variable (with ui-sans-serif, system-ui, sans-serif), width axis 62–72%
**Body Font:** Archivo Variable at 100% width
**Label/Time Font:** Archivo Variable at 80–88% width, tabular figures for times and prices

**Character:** One poster family stretched across its width axis. Display is condensed, very heavy (850), uppercase, and set tight enough to run edge to edge like a bill; reading text returns to normal width so it stays comfortable; labels and times sit in between, a touch condensed and heavier than the text.

### Hierarchy

- **Display** (850, 62% width, uppercase, 0.86 line height, -0.012em): the home hero (clamp(3.4rem, 8.2vw, 8.4rem), 11ch), page intros (clamp(3.2rem, 9.2vw, 8.6rem), 15ch), and the closing call (clamp(3.4rem, 10vw, 9.5rem), 13ch).
- **Price figures** (850, 62% width, clamp(7rem, 17vw, 15rem)): the €0 / €1 figures on pricing; smaller echoes on the home teaser and calculator total.
- **Headline** (850, 64% width, uppercase, clamp(2.6rem, 6.4vw, 5.6rem), 0.88, max 16ch): section titles.
- **Title** (850, 64–72% width, uppercase, 1.4–2rem): day-sheet tabs, strip names, trip names in ribbons and lanes, footer line.
- **Lede** (400, clamp(1.05rem, 1.3vw, 1.22rem), 1.5, max 40–52ch, soft ink): one paragraph under a heading; the hero and intro ledes sit under a 3px rule.
- **Body** (400, 17px, 1.55): page copy; legal prose in a 68ch column at 1.0625rem.
- **Row** (550, 15px): timetable rows on day sheets and demo boards; entries 13.5–14px.
- **Label** (750, 84–86% width, uppercase, 0.04–0.06em): buttons (14px; 16px large), nav links (15px), chips (12px), example labels (11px).
- **Time** (650–800, 82% width, tabular figures, 13–16px): every clock time, day stamp, and price in a row.
- **Fine** (14px, soft ink): reassurance under calls to action, captions.

### Named Rules

**The One Family Rule.** Archivo Variable is the only typeface. Hierarchy comes from width, weight, case, and size, never from a second face.

**The Tabular Time Rule.** Every clock time and price is set with tabular figures so timetable columns align and changing figures never jitter.

**The No Eyebrow Rule.** A heading stands alone. No kicker, category line, or section number sits above it.

## Layout

- **Container:** `.wrap` caps content at a 1320px measure plus gutters, centred, with a fluid gutter of clamp(16px, 4.5vw, 64px). Bills are full bleed and place a `.wrap` inside.
- **Section rhythm:** major sections use clamp(72px, 10vw, 152px) block padding. Pages alternate grounds (bill, paper, bill, ink) so section changes read as a change of sheet, not a divider.
- **Home:** cobalt hero with the headline across the left (1.25fr) and the day pile on the right (1fr); an ink ribbon of example trips; the tracked-kinds list on paper; the record section on cobalt; the pricing teaser on paper; the ink closing bill; the paper footer. The hero stacks below 960px.
- **Subpage frame:** cobalt masthead and page intro (display headline, rule, lede beside its call to action), the signature demo, the page's sections, a Next-feature pager on feature pages, the closing bill, the footer.
- **Pricing:** cobalt intro; €0 / €1 figures side by side under 3px rules; the example receipt beside the feature list; the cobalt calculator; the example-trip lane; FAQ disclosures.
- **Legal:** a dashed draft notice, a 280px sticky contents column beside a 68ch article; contents flow above the article on narrow screens.
- **Breakpoints in use:** 960px (hero), 900px, 880px (legal), 860px (nav menu), 760px (intro, footer), 640px, 560px, 480px, 420px. Phones keep a 16px gutter with no horizontal scroll.

## Elevation & Depth

The bill is flat print. Depth exists in one place: a proposed strip lifts off the sheet with a single shadow (`--lift`: 0 14px 22px -12px, ink at 55%; black at 80% at night), and loses it when pressed flush. The day pile shows depth by offsetting and scaling the sheets behind the front one, not by shadow. Panels are framed with a 2px ink line, never shadowed; the shared app shadows `--shadow-card` and `--shadow-xs` are set to none.

### Named Rules

**The One Lift Rule.** `--lift` is the only shadow, and it means "proposed, not yet applied". Anything flat is agreed.

## Shapes

Square corners throughout (`--radius: 0`): buttons, chips, panels, strips, sheets, toggles, and form controls. Structure is drawn with 3px ink or bill-ink rules (nav underline, section heads, price figures, lede rules), 2px frames for panels and buttons, and 1.5px hairlines between rows. A dashed edge means illustrative or not yet real: example labels (1.5px dashed), the draft notice (2px dashed), the strip's inset paste edge (2px dashed at -6px offset), and dashed underlines on open issues. Only avatars and status dots are circles. The Groam mark keeps its own 7px tile radius as a brand asset.

## Components

### Buttons

Solid printed blocks.

- **Shape:** square, 2px border in current colour, 2.5rem tall at 14px/750 condensed uppercase; large is 3.5rem at 16px with 26px padding.
- **Primary:** inverts its ground: ink on paper, bill ink on cobalt, yellow on the ink bill. It always reads "Start a trip" and opens the web app. Hover lifts it 2px.
- **Outline / Ghost:** transparent with a 2px rule (ghost borderless); hover fills with the ground's ink and inverts the text. Used for "See how it works", "See pricing", nav Sign in.
- **Focus:** a global 3px current-colour outline at 3px offset.

### Chips

- **Style:** small printed tags, 3px by 8px, 1.5px current-colour border, 12px/750 condensed uppercase, optional 13px icon.
- **Variants:** neutral (soft ink), Idea (yellow fill), Agent (sky fill), Done (green border and text). Colour carries meaning, never decoration.

### Avatars

26px circles with one initial at 12px/800 condensed, in the traveler's poster ink; agents are sky with a 1.5px inset agent-ink ring and a pin glyph.

### Surfaces

- **Corner Style:** square.
- **Background:** raised paper with a 2px ink frame, on any ground; a surface resets `--on` to ink.
- **Shadow Strategy:** none (see Elevation & Depth).
- **Use:** demo boards, the chat shell, the calculator sheet, the pricing receipt, lane tickets, the mobile menu sheet, the 404 ticket.

### The Paste-Over Strip (signature)

A yellow strip laid exactly over the rows it replaces, with a tab naming the idea and its author. Proposed: tilted -1.2deg, raised 4px, `--lift` shadow, 2px dashed inset paste edge. Applied (`.flush` / `data-flush`): no tilt, no shadow, no dashed edge. The change animates over 0.7s on the shared ease. Review lines (agent note, approvals) tick in beneath it before it presses down.

### Day Pile (home hero)

The hero pile is its own example week, "A week in Portugal" (Mon 3 to Sun 9 May, `src/content/home-pile.ts`): seven printed day sheets stacked on the bill, each telling a different story of a shared trip (an issue closed by an agent's idea, a chat that settles plans, an idea with changes requested and revised, an agent's research, an agent's edit, an issue still open, an agreed Sunday). Only the next two days show behind the front sheet, as tabs offset 32px up and scaled 3% smaller per step; later days wait unseen and fade in as they slide up, and a sheet leaving the visible pile fades before it moves. Strips paste over exactly the rows they replace, never outside the sheet; the strip names its kind inside its first row. Tabs, status lines and revised times crossfade. All sheets share the tallest height and the status line prints at the sheet foot, so turning never resizes the pile. Monday rests on top under no motion, every day at its end state.

### Example-trip labelling

Every illustrative surface carries `.example-label`: 11px/700 condensed uppercase in a 1.5px dashed current-colour outline. Headers place it beside their title; lists and lanes say "Example trips".

### Pause controls

Every self-running loop has a `.loop-toggle`: a 36px square with a 2px rule and a 15px pause or play glyph, `aria-pressed`, and a visually hidden label ("Pause the example trip"). It ships `hidden` and script reveals it only when the loop actually runs.

### Navigation

A cobalt masthead with a 3px bill-ink rule under it: mark and condensed wordmark, Features and Pricing as condensed uppercase links (hover inverts to a bill-ink block; current page gets a 3px underline), then ghost Sign in and primary Start a trip. Below 860px a `<details>` menu opens a surface sheet. A yellow skip link to `#content` precedes it. The footer is paper with the condensed "Plan together. Go further." line and Features, Product, and Legal columns under 3px rules.

### Motion grammar

- **Easing:** `cubic-bezier(0.16, 1, 0.3, 1)` (`--ease`) for every eased move; plain `ease` only for 0.15s colour hovers; `linear` only for marquees, progress fills, and the 404 walk.
- **Vocabulary:** crossfades in place (0.35–0.5s), rises of a few pixels (0.5–0.7s), sheet turns (0.8s), strip paste and press (0.6–0.9s), 80s marquees for ribbon and lane.
- **Loops** run only while on screen (IntersectionObserver), while the tab is visible, and while not paused.
- **No layout shift:** stacked states share one grid cell, sheets share one height, marquees translate a duplicated track.
- **Reduced motion:** smooth scrolling off, nothing autoplays, each demo rests on its finished, truthful state (the idea applied, Saturday on top). Without script the same stills render.

### The canonical example trip

`src/content/example-trip.ts` is the single source for every Lisbon demo: "Lisbon long weekend", Fri 13 to Sun 15 Nov, organised by Maya with Jonas, Priya, and Sam; the agreed plan; Maya's idea "Swap Belém for Sintra" with its removals, additions, agent note, approvals, and applied time; and the loose-end issues with the ideas that close them. A demo may stage this data at a different moment but never contradicts it. Secondary trip names (ribbon, pricing lane) are labelled "Example trips" and have no plan of their own. The hero\'s example week is the one other trip with a plan, kept in `src/content/home-pile.ts` and labelled "Example trip".

## Do's and Don'ts

### Do:

- **Do** set each section on a declared ground (`.bill`, `.bill-ink`, paper, `.surface`, `.strip`) and let components read `--on`, `--on-soft`, `--on-line`, and the CTA pair from it.
- **Do** keep raw colour values in `src/styles/tokens.css` only, with night values under `.dark`.
- **Do** show an idea as a paste-over strip: lifted, tilted, and dashed while proposed; flush when applied.
- **Do** set display type in Archivo at 62–72% width, 850, uppercase, and every time and price in tabular figures.
- **Do** draw structure with 3px rules and 2px frames, and keep every corner square.
- **Do** draw Lisbon demo data from `src/content/example-trip.ts` and label every illustrative surface "Example trip" or "Example trips".
- **Do** give every loop a visible pause control, stop it off screen and in a hidden tab, and ship a finished, truthful still under reduced motion and without script.
- **Do** use `cubic-bezier(0.16, 1, 0.3, 1)` for eased motion and keep transitions to calm crossfades, rises, turns, and pastes.
- **Do** write internal hrefs with a trailing slash (`/features/`, `/pricing/`, `/features/ideas/`).
- **Do** state pricing as published: free to plan on your own; €1 per invited traveler per trip, paid by the traveler or covered by whoever invites them; the trip creator and solo trips are free. Stripe Checkout applies when payments are enabled; existing trips stay free, and payments are skipped when Stripe is not configured.
- **Do** say "idea" for a suggested change, "traveler" for a person on a trip, and "Start a trip" for the primary action.

### Don't:

- **Don't** use gradients anywhere, on grounds, text, or borders.
- **Don't** put an eyebrow, kicker, or category label above a heading, or number sections.
- **Don't** round corners or add a second shadow; `--lift` belongs to proposed strips.
- **Don't** use yellow for anything that is not an idea or change, or sky for anything that is not an agent.
- **Don't** introduce a second typeface or set reading text condensed.
- **Don't** fall back to a white SaaS page with a product card beside a headline.
- **Don't** market open source, GitHub, or self-hosting; licensing is undecided.
- **Don't** invent claims: no customer logos, user counts, ratings, or prices beyond the published ones.
- **Don't** say "proposal", "bots", "platform", or "workflow" in visible copy.
