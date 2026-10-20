# Oxc configuration

`fmt.ts` (Oxfmt) and `lint.ts` (Oxlint) hold the shared formatter and linter policy. The
repository-root `vite.config.ts` composes them, and `vp check` runs both. Rules for parts of the
repository are scoped with `lint.overrides`.

`plugin/` is the `groam` Oxlint JS plugin. It holds Groam-specific guardrails and ports of Biome
rules that Oxlint has no built-in equivalent for.

| Rule | Guardrail |
| --- | --- |
| `convex-hooks-in-hooks` | Keeps Convex subscriptions and mutations in feature hooks |
| `no-local-type-definitions` | Keeps web app domain types in `apps/web/src/types` |
| `no-fetch-in-components` | Keeps network requests out of TSX components |
| `no-native-interactive-elements` | Keeps app controls on shared accessible UI primitives |
| `no-raw-icons` | Keeps icon providers, types, and inline JSX SVG behind `@groam/icons` (brand artwork stays in `@groam/brand`) |
| `no-direct-sonner-imports` | Keeps app notifications behind the shared UI facade |
| `no-raw-test-ids` | Keeps production web locators in the shared `testIds` contract |
| `no-raw-internal-anchors` | Keeps internal navigation in TanStack Router |
| `no-raw-locator-test-ids` | Keeps journey, browser-mode driver, and film locators in the shared `ids` contract |
| `no-native-browser-dialogs` | Routes browser prompts through the app dialog abstraction |
| `no-direct-web-storage` | Routes persistence through feature stores or shared adapters |
| `shell-columns` | Protects shared page-column composition and geometry |
| `planning-page-body` | Protects the shared planning page canvas |
| `no-nested-planning-page-body` | Prevents doubled planning-page padding |
| `scoped-descendant-variants` | Prevents unscoped Tailwind descendant variants |
| `cognitive-complexity` | Keeps functions at or below a cognitive complexity of 15 |
| `max-lines` | Keeps feature source files under 300 non-blank lines |
| `max-lines-per-function` | Keeps TSX functions under 250 non-blank lines |
| `no-delete` | Avoids the `delete` operator outside map-like objects |
| `no-re-export-all` | Keeps public entrypoints on explicit exports |
| `use-semantic-elements` | Prefers semantic DOM elements over ARIA roles |

Custom rules should enforce a repository-owned abstraction that Oxlint cannot express with a
built-in rule. Scope each rule narrowly in `lint.ts`, give its diagnostic an actionable
replacement, and add accepted and rejected fixtures under `tooling/quality`. Suppress a single
finding with `// oxlint-disable-next-line <rule> -- <reason>`.

Astro icon checks and stylesheet checks (hardcoded colors and `!important`) live in `tooling/quality/conventions.ts`,
because Oxlint does not lint CSS.
