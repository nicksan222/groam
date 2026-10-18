# Landing page templates

The landing site uses Astro components in `src/components`. These templates are
specific to the marketing site; React application primitives stay in `@groam/ui`.

## Sections and widths

Use `PageSection` for every content section. It owns the `.wrap` container and
outer spacing. Do not nest another `.wrap`, add local section padding, or cap a
demo's outer width.

```astro
<PageSection aria-labelledby="research-title">
  <SectionHeading headingId="research-title" title="Research together." body="…" />
  <ResearchExample />
</PageSection>
```

- `tone="paper"` is the default. Each edge receives half of `--section`, so two
  adjoining sections create exactly one gap.
- `tone="bill"` and `tone="press"` create full viewport background bands with
  one `--section` of inner space on each edge.
- `layout="split"` places two children on the shared equal-column grid, stacking
  below 900px. The default layout stacks content.
- The named `bleed` slot is for a deliberately edge-to-edge element, such as the
  pricing trip lane. Keep its heading in the default, contained slot.
- `PageIntro` is the shared page hero. `FeatureLayout` pairs it with `PageDemo`,
  which owns demo overlap and makes every demo fill the same rails as the hero.
- Reading columns and individual chat messages may have readability limits;
  surrounding section and board widths always come from the templates.

## Headings and content patterns

`SectionHeading` owns section title and lede styling, spacing, and responsive
columns. Use its default split layout above a full-width example, or
`layout="stack"` beside an example. Its default slot holds supporting notes.
`FeatureNotes` owns the repeated ruled title/body note grid.

## Interactive examples

`StepNavigation` owns the numbered controls for all example journeys and
background runs. Supply labels, panel IDs, an active index, and the existing
step data attribute. Keep example-specific state and keyboard behavior in its
script. Do not add local control styling in consumers.

All rails wrap on smaller screens. The selected ticket is yellow, labels remain
readable, focus is inset and visible, and progress uses the shared ease and
existing pause/reduced-motion lifecycle.

## Shared spacing tokens

Change region spacing in `--section`, heading-to-content gaps in `--content-gap`,
column gaps in `--column-gap`, panel insets in `--panel-padding`, and feature hero
overlap in `--demo-overlap`, all in `src/styles/landing.css`.

The browser layout suite checks section rails, section spacing, and hero demo
widths at mobile and wide viewports. Run the landing build and browser tests
after changing these templates.

## English and Italian

English source copy stays beside its component or in `src/content`. Italian
messages live in `src/i18n/messages`, grouped by section. Use complete source
phrases as keys; whitespace is normalized. Keep `{placeholders}` identical in
both languages and use separate singular and plural messages when needed.

`LandingLayout` renders the body through `LocalizedContent` at build time. Its
HTML parser translates text and an explicit allowlist of copy attributes,
localizes known page links, and preserves state hooks, IDs, scripts, styles,
and `translate="no"` regions. Missing rendered Italian messages fail the build.
Do not add a second translated copy of a page: the Italian route reuses the
original page components. The language switcher retains the current page,
query, and anchor. Head metadata and sitemap language alternatives are shared.

For client-generated text use `translateText`; for generated HTML use
`translateHtml` before insertion. Add dynamic source phrases to the section's
`aiRuntimeKeys`, `interactionRuntimeKeys`, or `pricingRuntimeKeys` export (or the common catalog). Dynamic content modules are
selected in `runtime-sources.ts`; only the current page's messages and shared
interaction messages ship to the browser. Keep machine values untranslated.
Do not translate the live document after paint.

Use `updateLoopControl` for looping examples so pressed state, pause/resume
labels, and language stay in sync. Hide inactive stacked sheets from assistive
technology as well as pointer interaction.

The localization browser tests cover both rendered and generated copy, language
links and metadata, interpolation contracts, and Italian layouts at narrow and
wide widths. Build before running them because the suite serves `dist`.

Catalogs reject conflicting translations of a shared phrase during the build.
The global static 404 selects the Italian 404 before body paint for `/it/*`
requests. Hosts should also route unknown Italian paths to `/it/404/index.html`
with status 404 when supporting visitors without JavaScript.

`IdeaHeading` gives a highlighted heading one continuous card with its own line
height. Use it instead of cloning padded inline backgrounds across wrapped lines;
those backgrounds can cover the preceding line, especially in Italian.
