---
version: 1
slug: "es-trips-trip-detail-trip-detail-view-tsx-ba3cdc56"
primary_target: "src/features/trips/trip-detail/trip-detail-view.tsx"
related_targets: []
---

# Trip workspace

Mode: Operate. Scope: shared UI foundations and trip workspace.

## Direction contract

THESIS: A clear shared trip with reviewable ideas and private contextual assistance.

OWN-WORLD: Shadcn-like all-sans typography, white and zinc surfaces, evergreen actions, quiet hairlines and compact rounded controls. Dark mode uses the same hierarchy.

STORY: Read the agreed itinerary, open an idea to propose changes, and ask Groam AI for private help. Existing data and permission rules remain authoritative.

FIRST VIEWPORT: Sidebar on the left with the trip switcher and the trip's sections (Plan, Calendar, Ideas, Issues, Polls, Packing, Research, Chat, Activity, People, with counts on Ideas and Issues), then one compact page header: the section's title and one descriptive line, the section's one creation button (Suggest a change on Plan and Calendar, New idea, New issue, New poll) (Ideas, Issues, and Polls each list one kind, grouped by whose turn it is, with a search and a Show segmented control) and the Trip actions menu on the right. No cover banner and no tab strip; below md the same sidebar opens as a sheet from a top app bar. Plan is the landing: the agreed itinerary day by day under a slim "your turn" strip; Calendar is its own section and fills the page. The sidebar's footer holds the account: Home, Inbox, Chats (no-trip conversations), Settings, and the account menu. Group switching sits at the bottom of the trip switcher menu (a "Group: {name}" submenu) and in Settings › Group, not in a sidebar row. Search opens a trip-scoped command palette: Go to the trip's sections, then its Ideas, Issues and Chats, then Switch to another trip. Private assistant opens at right. Actual trip content replaces illustrative mockup content.

FORM: User-selected revised mockup, overriding the earlier conceptual roll (seed 0c539c63). The approved shadcn direction is .impeccable/mocks/approved-trip.png. One roster entry point replaces the mockup duplicate. No fabricated messages or trip data.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
