---
name: Groam
description: A calm shared workspace where people and agents turn trip ideas into agreed plans.
colors:
  primary: "#496b9b"
  primary-hover: "#3c5b86"
  background: "#fdfdfd"
  canvas: "#f4f4f6"
  foreground: "#32343b"
  card: "#fafafa"
  muted: "#efeff2"
  muted-foreground: "#636671"
  accent: "#e9eaee"
  border: "#e1e2e6"
  input: "#cccfd5"
  ring: "#496b9b"
  destructive: "#a14c5e"
  success: "#416e61"
  warning: "#875f2e"
  info: "#496b9b"
typography:
  display: {fontFamily: "Google Sans Flex Variable, ui-sans-serif, system-ui, sans-serif", fontWeight: 600}
  body: {fontFamily: "Google Sans Flex Variable, ui-sans-serif, system-ui, sans-serif", fontWeight: 400}
  label: {fontFamily: "Google Sans Flex Variable, ui-sans-serif, system-ui, sans-serif", fontWeight: 500}
  mono: {fontFamily: "Google Sans Code, ui-monospace, SFMono-Regular, monospace"}
rounded: {default: "0.5rem", button: "0.5rem", badge: "0.375rem"}
spacing: {base: "0.25rem"}
components:
  button-primary: {backgroundColor: "{colors.primary}", textColor: "#ffffff", rounded: "{rounded.button}", height: "2rem", padding: "0 0.75rem"}
  button-secondary: {backgroundColor: "{colors.muted}", textColor: "{colors.foreground}", rounded: "{rounded.button}", height: "2rem", padding: "0 0.75rem"}
  card: {backgroundColor: "{colors.card}", textColor: "{colors.foreground}", rounded: "{rounded.default}", padding: "1rem"}
---

# Design System: Groam

## Overview

**Creative North Star: "The Shared Trip Table"**

Groam is a refined, calm workspace for people and AI agents planning together. The visual language is shadcn-style and all-sans: white and soft neutral light surfaces, a neutral charcoal dark hierarchy, quiet hairlines, restrained actions, and compact rounded controls keep attention on the itinerary and reviewable collaboration. The Groam brand mark, a person's white pin in front of an agent's cyan pin on a Tokyo blue tile, appears on brand, authentication, onboarding, and full-page status surfaces; the workspace sidebar begins with the current trip, then Search.

The approved trip direction uses a left sidebar, compact navigation, and an assistant dock at the right on wide screens that overlays smaller screens. Its panoramic trip cover was dropped from trip pages: covers now live on trip cards and in the trip switcher. The approved reference is `apps/web/.impeccable/mocks/approved-trip.png`; it is a direction reference, not proof of visual QA.

**Key Characteristics:**

- Human and agent collaboration is legible in one shared workspace.
- Muted slate-blue actions lead in both themes, with neutral text and subdued status colors.
- Typography is compact, neutral, and entirely sans-serif.
- Depth comes from tonal layering, hairline borders, and restrained shadows.

## Colors

The approved palette is **Graphite**: neutral charcoal in dark mode, soft off-white in light mode, and muted slate blue for actions. Color supports hierarchy and status without competing with the itinerary. Both themes use the same semantic roles from `packages/ui/src/styles/tokens.css`.

### Primary

- **Slate Blue** (#496b9b light / #8b9fc4 dark): Actions, selection and focus. Primary buttons use white text in light mode and dark text in dark mode.
- **Slate Blue Hover** (#3c5b86 light / #9baccb dark): A restrained change in lightness for interactive feedback.
- **Status**: Desaturated green for success, ochre for warnings, and rose for destructive actions. Badges use light tints and readable colored labels instead of solid saturated fills.

### Neutral

| Role | Light | Dark |
|---|---|---|
| Page | #fdfdfd | #191a20 |
| Canvas | #f4f4f6 | #121318 |
| Card and dialog | #fafafa | #191a20 |
| Popover | #f8f8fa | #202127 |
| Main text | #32343b | #c5c7d0 |
| Supporting text | #636671 | #a0a3af |
| Muted controls | #efeff2 | #262831 |
| Selection | #e9eaee | #2b303c |
| Border | #e1e2e6 | #30323b |
| Input border | #cccfd5 | #41444f |

Avatar hues and chart categories remain distinguishable with reduced saturation. Text and small status labels must retain at least 4.5:1 contrast on their surfaces; focus indicators remain visible in both themes.

### Ownership

`packages/ui/src/styles/tokens.css` is the color authority. Shared workspace surfaces, layout rules and motion live in `packages/ui/src/styles/workspace.css`; chip and status-lozenge recipes are exported from `@groam/ui/lib/chip`. The web stylesheet only imports shared packages and declares external Tailwind sources. Feature code consumes semantic utilities and maps domain state to shared visual roles.

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

Desktop uses a left sidebar and flexible content canvas. The shared sidebar is 16rem expanded, 3rem in icon mode, and 18rem as the mobile sheet. A trip page has no cover banner and no tab strip: the sidebar names the trip and lists its sections on every device (Plan, Calendar, Ideas, Issues, Polls, Packing, Research, Activity, People), and each section opens under the one page header (below). On a trip section its parent is the trip's name (a link to Plan except on Plan itself; it hides below `lg`, because on phones the top bar names the trip) and its title is the section's name; the actions are one cluster at the right: from `lg` a ghost-like 32px going link (up to four overlapping 24px faces under a page-background ring, and the count; it leads to People and is absent on People), a 20px divider, the outline icon Trip actions menu with Edit details, Archive, and the rest, and New idea where the section's own button is something else, and last the section's one creation button: Suggest a change on Plan and Calendar, Suggest gear changes on Packing, New idea on Ideas, New issue on Issues, New poll on Polls, or New research. Only Plan has a facts line. Plan is the trip's landing: the agreed itinerary day by day (`?day=` scrolls to a day) with the budget badge and the route, under a quiet "Your turn" card (up to three of the viewer's open issues, ideas, and polls, each a link into its page, in a `[1rem_1fr]` grid with the title on up to two lines and the tinted state chip, then the due chip, beside it from `sm` and under the title below; small "N more in Ideas" / "N more in Issues" links to that queue, where Your turn is the top group, when more wait; "N of M mandatory done" progress; hidden when there is nothing). Each plan card says what it is at a glance: a 32px tile in its kind's hue (`--plan-activity` info blue, `--plan-stay` chart violet, `--plan-travel` warning amber, `--plan-place` success green: palette roles in `tokens.css`, never hex) holding its icon (the transport mode, check in or out, or what an activity does: a meal, a walk, a museum), a faint wash and hairline of the same hue, the kind's word in that hue before the place (travel shows its duration), then the notes as reading text and a row of fact chips (address, cost, files, check in and out) whose icons take the hue. Cards are built as a strategy per kind (`plan-kind-strategies.ts` turns an activity, travel, stay event, overnight stay or unplaced stop into one `PlanCardModel`) drawn by composable pieces (`PlanCard`, `PlanCardHeader`, `PlanCardTile`, `PlanCardTitle`, `PlanCardBody`, `PlanFact`, or `PlanCardFromModel` for a whole model) that read the kind from context; a new kind is one strategy and one look. Calendar is the same plan on a calendar that opens at 8 AM. One page header serves every page (`Shell.Header` in `packages/ui`; trip sections, issues, ideas, research, chats, agents, Home, Inbox, Trips, and Settings all compose it, and no page draws its own). It has no bottom rule, no band, and no background: it is part of the page surface, scrolls with the page, and shares the page's horizontal inset (`px-4`, `md:px-6`). The title row holds an optional parent (muted, the same size as the title, truncating before the title does, a link to the section or list the page belongs to), a light slash, the title (`text-xl`, semibold, never truncating before the parent), an optional status chip after the title (an idea's Draft), and the actions cluster at the right (an optional going-style lead control, a divider, the outline icon menu, then one primary action: a filled default-size 32px `Button`; each is a `Shell.Action`). Below `md` the actions leave the header for the action dock: a fixed vertical stack of round icon-only buttons at the bottom-right (16px from the edge, 16px above the bottom plus the safe area, 12px apart, above content and below dialogs, menus and toasts), in the order the page passes them, so the secondary ones (the menu, copy link) sit above and the one primary is the lowest, nearest the thumb: the primary is a 48px filled circle, a secondary a 40px circle on the popover surface with a hairline. The label becomes the accessible name and tooltip, the going lead control stays desktop-only, and an archived trip or a viewer with no actions has no dock. The dock hides while a text field has focus, and a page that ends in a pinned composer (a chat) lifts it above the send button with `--shell-dock-lift` (`dockLift` on `Shell.BannerLayout`). On phones the title row is only the back arrow and the title (up to two lines, the full width) with the status chip under it. From `md` the row has a fixed height derived from the sidebar's own metrics (`SHELL_HEADER_ROW` in `shell-layout.ts`: twice the centre of the trip switcher card), so the title's vertical centre sits on the centre of that card on every page. One optional muted facts line (`text-sm`) hangs directly under the title, then 16px (24px from `md`) before the page body (`SHELL_HEADER_BODY_GAP`, owned by the header, once); the body adds no top padding of its own. Every page body is `Shell.PageBody`: `padded` (`px-4 md:px-6`, centred to 1600px, 24/32px between blocks, 32px below from `md`; on phones it clears the action dock, `clearNav` is the same clearance) or `bleed` (Calendar, chat: no inset, content aligns to the header with `SHELL_BLEED_INSET`). Features pass no spacing classes to either. Detail pages use the same anatomy: an issue is Issues, then its title, with the status select, its labels, and the due chip on the facts line (who opened it is the timeline's first entry; below `xl` the assignee, "Decide by", and "Done when" lead the conversation in a compact block, Idea and Research follow it); an idea is Ideas, then its title and state chip, with "Draft · not part of the agreed plan · budget" on the facts line, and its tab strip stays page content directly under the header with its own underline. Top-level pages have no parent. Below `md` a section or list parent collapses to a back arrow before the title, a trip parent hides, and the top app bar stays. Ideas, Issues, and Polls are three queues of one design: one list of flat rows with a muted state chip (only the status is tinted, and a row names no kind because its section already does), grouped under collapsible `List.Group` headers with a button header and `aria-expanded`: "Your turn · N" first, then "Waiting on others · N" (just "Open · N" when none of the open rows is the viewer's), then "Settled · N", which starts folded and unfolds by itself while a filter is active. The viewer's rows carry a 2px primary bar. There are no Open/Yours/Settled tabs and no `?show=`. K opens the filter dialog, styled like the Ctrl+K palette: typed `key:value` filters with hints under the field (Issues: `assignee:me|unassigned|<name>`, `is:mandatory`) and free text matching titles. An active filter shows as an input-like bar above the list with its chips, the match count, and a clear button. The desktop footer hints are keyboard hints, and the clickable ones (K filter, C new) are subtly styled buttons; phones get a mobile-only "Filter" action in the header's dock. Every "waiting on you" row (these queues, Plan's strip, Home) orders its chips the same way: the tinted state, then the due date. Due dates say their words ("Decide by Oct 25", "Closes Oct 25"). Issues and ideas open their own pages; a poll expands in place into its bare options. Empty states name the section and offer a way out (clear the filter, or the first thing to start). Plan's line carries destination, dates, length, and budget; the "M going" count ("N in group · M going" when the group is larger) links to People and, from `lg`, lives in the action cluster instead of the line; below `lg` the line is one row ending in the going link with a small face stack (length and budget drop below `lg`, destination below `sm`), and the title row is just the section title, the menu, and the button (on phones the last two sit in the dock). An archived trip adds a quiet read-only notice under the header. People is a boarding manifest, laid out by its own container width (the sidebar may be open) rather than the viewport. At the top sits Your pass (only when the viewer is on the roster): one `shadow-card` card with the viewer's 44px tinted face, a `text-lg` title for where they stand ("You're going to Porto" with the destination when known, "You said yes — your seat is next", "You're a maybe", "You're not going") and a muted line that says what to do next ("Pay your €1 seat and you're going.", "Going needs your €1 seat first.", "Organizer · you can move anyone and cover their seat." (just "…move anyone." without payments), "Change your answer any time.", or "This trip is archived."), a 32px-tall segmented radio group named "Your RSVP" (Going, Maybe, Not going; arrow keys, Home and End move the choice; the checked one sits on the page background, Going in success with a check; Going is disabled, with its reason in text the radio is described by, while a seat is unpaid, and the whole group is when the trip is archived), and, on trips that take payments, a stub behind a 1.5px dashed divider with two page-colour notches: "Your seat", then Free, Paid, or €1 due (with Pay €1, the only place your own seat is paid). When the container is narrow the pass stacks (person, full-width control, stub under a horizontal divider). Readiness follows: "18 of 27 cleared to go" with a muted "· 3 blocked · 4 deciding · 2 out" (zero parts omitted) and "≈ amount planned per traveler" at the right (the amount in foreground), over one bar of 10px segments sized by headcount (cleared success, blocked warning, deciding a hollow input-colour ring, out muted), each with its count and word; without payments nobody is blocked and "cleared" reads "going". Then groups, each a `section` named by its title with a header (a 22px tinted icon tile, bold title, muted count and reason) over a bordered rounded list, and empty groups left out: Blocked (going without a seat, only on trips that take payments; warning tile and a faintly warm border; rows of 28px face, name and @handle, "Waiting on their seat", and Cover €1 where the viewer may pay it, which stays its own button beside the row), Deciding (maybe; "Seat already paid" or "No seat yet", never a Cover button on the row), Cleared (going; one bordered box of hairline-ruled cells, 2 columns and 3 from a wide container, 24px face, name, and a quiet success check; the whole cell is a button that opens the person's card, with a quiet hover wash that stays while the card is open), and Not going (one quiet line of muted overlapping faces and the first names with "+N", and a ghost Show / Hide that opens a plain list of rows). Status and action columns have fixed widths so rows align across groups; in a narrow container the status moves to a line under the name. The viewer is in their own group first, tagged "You" (in Cleared with a primary wash and the 2px primary bar), with no Pay button on the row, because the pass owns their RSVP and seat. Every person is a button (the whole Cleared cell; the face, name and status of a row) that opens their person card, for every viewer: a `w-80` popover on the popover surface under the person, or a bottom sheet titled with their name on phones. Its header is a 40px face, the name (with a "You" tag for the viewer), the @handle, and a status chip at the right (Going in success, Needs a seat in warning, Maybe neutral, Not going outlined and muted). On trips that take payments a hairline-ruled seat line follows ("Seat paid", "Free seat" or a muted "No seat yet") with Cover €1 (Pay €1 for yourself) at the right for a yes or a maybe without a seat, when the viewer may pay it. Where the viewer may change the person and the trip is not archived, a radio group named "RSVP for Name" closes the card: Going, Maybe and Not going rows, each a 28px tinted icon tile, the label, and one muted line of consequence ("Joins the 3 going", "Needs a seat first" with the row disabled, "Hasn't decided yet", "Stays in the group, off this trip"); the checked row is washed with a primary check, arrow keys move focus (picking saves, so moving does not), a pending pick shows a spinner while the group waits, and a saved change closes the card and returns focus to the person's new place. An archived card shows the header and seat line and says "This trip is archived." Motion respects reduced motion. Payments trips end with the muted note "Everyone going needs a €1 seat. Checkout opens on Stripe." "Invite to group" is the header's button for group owners and admins (it adds someone to the group, and so to every trip). An archived trip says its RSVPs and payments are read-only, once. Calendar fills the page and scrolls inside itself; every other section sits in a padded page body. Trip covers live on the trip list and in the trip switcher. Private assistance docks right at wide (`xl`) layouts and overlays smaller screens. Use the 0.25rem spacing base and shared compact control heights.

### Dashboard

Home is what waits on the viewer, then their trips. The header is the greeting, the group's name, and Create trip (the dock's primary on phones). Your turn comes first: one list across the trips, soonest due first, in the trip queues' row style with the trip named (the section's icon, the title, a kind word, the trip as a chip, the tinted state, and a due chip); it shows five rows, then one footer row: a ghost "Show all N" / "Show fewer" button and, on the same line, a muted note only when something is missing ("18 more in other trips", plus " · from your 12 most recent trips" when the read was truncated). Polls link to the trip's polls. With nothing waiting it says "Nothing is waiting on you." in one quiet line; when more trips exist than were read (twelve), it says "Nothing waiting in your 12 most recent trips." instead. Your trips follows: the active trips as cards (favourites first, at most six, then an "All trips" link). A card is a cover (112px, only when the trip has one) or a 40px tile with the trip's initial, the name, destination and dates, and at the bottom quiet counts ("2 ideas", "1 issue", "1 poll") each linking to that section; a zero is left out, a placeholder holds the space while the counts load, a trip the viewer holds no seat on shows how to join instead, and an archived trip says Archived. Cards in a row share a height. The same card, in the same `sm:grid-cols-2 xl:grid-cols-3` grid and reading the same turn query for its counts, fills the All trips page (`/trips`, with search and an Active / Archived / All filter that shows in the URL as `?status=`). No trips asks for a first trip; only archived trips point to them ("See archived trips" opens `/trips?status=archived`). Group-wide Ideas, Issues, and Agents lists no longer exist: each item lives in its trip.

## Elevation & Depth

Tonal layering and quiet borders establish hierarchy; small shadows support controls and transient surfaces. Cards, dialogs, alert dialogs, and sheets share the card surface. Menus and popovers use the slightly elevated popover surface. Dark mode uses a deep canvas (`#121318`), inset sidebar (`#15161b`), neutral page and cards (`#191a20`), and popovers (`#202127`). The scrim is `#000000b8` in dark mode and `#24242440` in light mode. Auth surfaces use the same restrained slate family.

### Shadow Vocabulary

- **Control:** `0px 1px 2px 0px hsl(0 0% 0% / 0.05)` (`--shadow-xs`).
- **Small surface:** `0px 1px 3px 0px hsl(0 0% 0% / 0.08), 0px 1px 2px -1px hsl(0 0% 0% / 0.08)` (`--shadow-sm`).
- **Card:** `0 2px 8px rgb(0 0 0 / 4%)` (`--shadow-card`).

## Shapes

The base radius is 0.5rem. Buttons and inputs use rounded-lg; badges use rounded-md (0.375rem). Borders are quiet and generally one pixel. Buttons are 2rem default, 1.75rem small, and 2.25rem large; inputs are 2.25rem high. Avoid pill silhouettes unless an existing component API calls for them.

## Components

### Buttons

- **Shape:** Rounded-lg (0.5rem), one-pixel border, compact height.
- **Primary:** Muted slate blue with high-contrast text, `2rem` high and `0 0.75rem` padding; hover uses the matching slate-blue hover token.
- **Hover / Focus:** Color transition; 2px blue focus ring with 1px offset; active removes small shadow.
- **Secondary / Ghost / Tertiary:** Secondary is muted with input border; outline uses page background; ghost is borderless with muted hover; link underlines on hover.

### Chips

- **Style:** Rounded-md, 0.375rem, `0.5rem` horizontal and `0.125rem` vertical padding. Semantic variants use restrained tinted status colors.
- **State:** Reserve semantic colors for status rather than decoration.

### Cards / Containers

- **Corner Style:** Rounded-lg (0.5rem).
- **Background:** Soft neutral off-white on canvas; dark mode uses the subdued dark card surface.
- **Shadow Strategy:** Prefer border and tonal separation; lift only with shared small/card shadows.
- **Border:** `var(--border)` for default cards.
- **Internal Padding:** 1rem compact, 1.5rem at medium widths.

### Inputs / Fields

- **Style:** 2.25rem high, full width, rounded-lg, input border, page background, control shadow.
- **Focus:** Blue border and 3px translucent blue ring.
- **Error / Disabled:** Destructive border/ring for invalid fields; disabled fields are non-interactive and reduced in opacity.

### Navigation

The sidebar uses a muted surface and foreground. Dark active navigation uses a tinted neutral surface; blue remains reserved for actions and focus. Desktop supports off-canvas and icon collapse; mobile uses a sheet. The sidebar is trip-first and has three parts. The header is the trip: the trip switcher card, then Search directly under it as an input-shaped field on the background surface (the `Ctrl K` / `⌘K` hint hides below `md`), closed by a hairline; there is no group switcher row. Groups are switched from the bottom of the trip switcher menu (a submenu row with the group's logo or initial, its name, and "Group · Role" under it, listing the other groups, Join with code, New group, Group settings; it is offered with no trip chosen too) and from the Groups list at the top of Settings › Group. The trip switcher card sits on the background surface with a hairline border and the control shadow (rounded-xl): a 40px cover or initial tile, the trip's name in semibold on one line (a longer name ends in an ellipsis; the full name is its tooltip), so the card is always the tile beside two even lines, and under it when the trip is (dates, else date notes, else length). It carries no eyebrow: the group and role are in its accessible name and in its menu. With no trip the card is dashed. Icon-collapsed it is the cover alone. The content is the trip's sections (Plan, Calendar, Ideas, Issues, Polls, Packing, Research, Activity, People) with counts on Ideas, Issues, and Polls (what waits on the viewer, else what is open), Research (unread), and Chat (unread); counts appear only once loaded and above zero, and become a dot in the icon rail. A count of what waits on the viewer is a small filled primary pill (`bg-primary text-primary-foreground`, rounded-full, 11px); the others stay muted text. The active row carries a 2px primary bar. The switcher menu opens beside the sidebar (under the card on phones) and lists Favourites and Recent trips (at most eight; each row a 32px cover or initial tile, the name, and the destination under it, the current trip checked), All trips, New trip, then "This trip" with Favourite and Copy link, then the group row. Opening another trip keeps the section the traveler is on. The current trip is the route's trip, else the last shared trip opened in this group on this device (an issue's own page remembers its trip, since its URL names none); with none, the card is dashed and reads "Choose a trip" and the sections are hidden. The footer holds Home, Inbox (badge), Chats (badge), Settings, and the account menu (name over email). Chats is for conversations with no trip (its page uses the shared header: "Chats", "Conversations that aren't tied to a trip.", and a New chat button; with none open the right pane is one quiet line); a trip's own chats are its Chat section, and agents are not a destination (their runs show on the item they work, in Chat, and in Activity). There is one navigation system on every device: below `md` the sidebar is a sheet (titled Menu) with exactly the same content, opened from a top app bar that holds the menu button, the current trip's name (or the page's title off a trip), and the assistant sparkle. There is no bottom bar.

The command palette (Search in the sidebar header, `Cmd/Ctrl+K`) is trip-scoped. With a current trip (the route's, an idea working copy standing for its trip, or the remembered one) it lists, in order: Go to (the trip's eleven sections, with the sidebar's labels and icons), the trip's Ideas and Issues, Chats (this trip's first at equal score), and Switch to (the other trips, keeping the section on screen, with Load more). Off a trip there is no Go to and the trips group reads "Trips". Agents are not in the palette. The per-trip lists use the sidebar's own subscriptions and are skipped while the palette is closed.

### Assistant Dock

Private contextual help uses a sidechat pattern: a header shows the active conversation title and opens chat history, with controls for new chat, widening, and closing. At viewports 1280px and wider it docks at 24rem by default and can widen to 40rem, capped at 40vw. Below 1280px it is an accessible sheet; on phones it fills the viewport height with safe-area padding. A quiet context bar sits above one composed input with attachments, stop/send states, and the AI notice. The controlled draft survives layout changes and thread selection. Its controls use the same all-sans, neutral-surface language as the workspace.

## Do's and Don'ts

- **Do** use the Groam brand mark on applicable brand and authentication surfaces, and preserve the Graphite slate-blue primary role.
- **Do** keep agreed plans, proposed ideas, and private assistance understandable.
- **Do** use shared UI primitives and semantic color tokens.
- **Do** preserve compact rounded controls and quiet hairlines.
- **Don't** introduce a serif display face, second visual brand, or unverified type metrics.
- **Don't** turn illustrative mockup data into product truth.
- **Don't** let the assistant compete with or obscure the itinerary.
- **Don't** claim visual QA is complete from the mockup alone.


List filters use the shared `List.Search` composition across Ideas, Issues,
Polls, Research, and Activity: K or the clickable footer hint opens the same
filter dialog; active queries appear above the rows as chips with matching
counts and Clear. Filter and Sort buttons live only in the bottom list bar on every device. Ideas supports
status, author, and turn; Polls supports status and turn; Research supports
unread and saved links; Activity supports person and action. Research and
Activity keep sorting in the shared footer; Sort opens a dialog listing all orders and marks the current one. Domain matching stays in feature
code (`filterQueueItems(items, { parsed, slugs })` is the one filtering path for queues); the list primitive owns presentation, completion, and keyboard handling.

The filter dialog is a Datadog-style `key:value` field. One 44px text gutter runs
through it: the input row (16px side padding, 16px list-filter icon, 12px gap), every
hint row (16px leading icon slot: the facet's own, else the filter icon), each group
heading, and the one muted line shown when nothing is suggested ("Matching titles. Try
assignee: or is: to filter."). Recognised `key:value` words are coloured inside the
input itself by a mirror layer behind transparent input text (key muted, value in the
foreground, on a soft chip drawn with background and box-shadow only, so the glyphs
stay pixel-aligned; the weight never changes inside the field). The input is 16px on
phones and 15px from `md`. Hints are full-width rows (36px, 44px on phones) in
labelled groups: the label is sans text (key muted, value medium), the description is
right-aligned, and the highlighted row has an inset 2px primary edge and the accent
fill, ending in a Tab cap whose width every row reserves. The first hint is
highlighted from the start; ↑ ↓ move it, Tab completes it while a word is started, and
Enter applies it only after the highlight was moved or a word is started (otherwise,
or when the word is already complete, it closes). Bare keys are offered from two
typed letters; a trailing `key:` with no value filters nothing. The hints area keeps
its height so the dialog does not jump. The footer (hidden on phones, which get a Done
button in the input row) reads "↑↓ navigate", "Tab complete" (only when it completes),
"↵ / Esc done", and "N of M issues" at the right. The active-query bar above the list
uses the same token style (a muted key and a medium value on a `bg-muted` chip), the
filter icon, the count, and a clear button after a divider. Footer hints with an
`onClick` are small outlined buttons holding a borderless key cap; the others stay flat.
Queue group headers fold only while folding applies: never while searching, nor when
Settled is the only group. The add-question row closes the open groups, above Settled.


List controls compose `List.Footer > List.Controls > List.Sort + List.SearchTrigger`
across Ideas, Issues, Polls, Research, and Activity. The outlined buttons share
one implementation; Filter carries a K key cap, and its list-filter icon uses the
foreground token in both themes. Desktop keeps Filter/Sort in the bottom list bar. On phones that bar hides, and
Filter/Sort become secondary `Shell.Action` buttons in the header action dock,
opening the same dialogs through shared trip request state. Keyboard navigation hints hide before
crowding the controls in a narrow pane. Activity newest-first explicitly sorts
by event time. Queue sorting preserves the fixed turn/settled sections and
orders their rows; the sort dialog explains this.
