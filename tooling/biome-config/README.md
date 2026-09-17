# Biome configuration

`biome.json` contains the shared formatter and built-in linter policy. The repository-root
`biome.json` extends it and scopes Groam-specific Grit plugins to the code they own.

| Plugin | Guardrail |
| --- | --- |
| `convex-hooks-in-hooks.grit` | Keeps Convex subscriptions and mutations in feature hooks |
| `no-local-type-definitions.grit` | Keeps web app domain types in `apps/web/src/types` |
| `no-fetch-in-components.grit` | Keeps network requests out of TSX components |
| `no-native-interactive-elements.grit` | Keeps app controls on shared accessible UI primitives |
| `no-direct-sonner-imports.grit` | Keeps app notifications behind the shared UI facade |
| `no-raw-test-ids.grit` | Keeps production web locators in the shared `testIds` contract |
| `no-raw-internal-anchors.grit` | Keeps internal navigation in TanStack Router |
| `no-raw-playwright-paths.grit` | Keeps browser navigation aware of the configured app base |
| `no-raw-playwright-test-ids.grit` | Keeps browser locators in the shared `ids` contract |
| `no-native-browser-dialogs.grit` | Routes browser prompts through the app dialog abstraction |
| `no-direct-web-storage.grit` | Routes persistence through feature stores or shared adapters |
| `shell-columns.grit` | Protects shared page-column composition and geometry |
| `planning-page-body.grit` | Protects the shared planning page canvas |
| `no-nested-planning-page-body.grit` | Prevents doubled planning-page padding |
| `scoped-descendant-variants.grit` | Prevents unscoped Tailwind descendant variants |

Custom rules should enforce a repository-owned abstraction that Biome cannot express with a
built-in rule. Scope each plugin narrowly in the root config, give its diagnostic an actionable
replacement, and add accepted and rejected fixtures under `tooling/quality`.

Built-in rules also enforce maintainability: feature source files stay under 300 non-blank lines,
cognitive complexity stays at or below 15, functions accept no more than four parameters, tests
avoid deep suite nesting, CSS avoids `!important`, and public entrypoints use explicit exports.
