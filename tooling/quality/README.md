# Quality checks

Repository rules that neither TypeScript nor Oxlint can express. Each rule has one owner:

| Owner | Enforces | Run by |
| --- | --- | --- |
| TypeScript | Package subpaths: only what a package exports or imports (`#src/*`) resolves | `vp run typecheck` |
| Oxlint (`tooling/oxc-config`) | Code rules and import boundaries: parent-directory imports, backend `@groam/env` access, page composition | `vp check` |
| `conventions/` | File and folder names, CSS and Astro templates, cross-file and manifest rules | `vp run lint:conventions` |
| `agents/` | Shared skills and roles, native adapters, MCP and dev container configuration | `vp run lint:agents` (`just sync-agents` writes adapters) |
| `release/` | The release workflows and `tooling/deploy/environments.json` | `vp run test:quality` |

## Conventions

Each convention is one JSON definition in `conventions/rules/`; the file name is the rule name.
Adding or removing a rule means adding or deleting a file: no code changes.

```jsonc
// conventions/rules/important-styles.json
{
  "$schema": "../rule.schema.json",
  "harness": "pattern",
  "message": "Avoid !important in stylesheets; use cascade layers or specificity instead",
  "include": ["**/*.css"],
  "pattern": "!\\s*important\\b",
  "ignoreComments": true,
  "examples": [
    { "files": { "a.css": "/* never !important */" }, "reports": [] },
    { "files": { "a.css": "color: red !important;" }, "reports": ["a.css:1"] }
  ]
}
```

- `harness` picks the generic check that runs it. [`rule.schema.json`](conventions/rule.schema.json)
  documents each harness and its settings, so editors validate and complete definitions:

  | Harness | Checks |
  | --- | --- |
  | `path-names` | Folder or file names match a pattern (with exceptions within some paths) |
  | `forbidden-files` | No file matches the scope |
  | `companion-files` | Each file has a companion (`{base}.test.ts`, `src/backend/{name}.ts`) |
  | `mentioned-in` | Each file is mentioned (`{name:camel}`) in the listed files |
  | `referenced-elsewhere` | Each file is imported, directly or through other scoped files, by code outside the scope; imports are resolved (relative or alias prefix), so mentions and same-named files do not count (an unused or only mutually-used `packages/ui` component fails) |
  | `pattern` | A regular expression never matches (per line, first line, or per file) |
  | `only-allowed-content` | Files contain nothing but allowed statements |
  | `max-matches` | A pattern matches at most N times per file |
  | `dependency-boundaries` | Package manifests depend only on the allowed `@groam/*` packages |
  | `export-targets` | Package exports point at existing files |

- `include` and `exclude` are globs of repository paths. Generated and vendored files never reach
  a rule.
- `examples` are the rule's tests: `rules.test.ts` runs every example of every definition, and
  each rule needs at least one example that reports.

`definitions.ts` loads and validates the definitions, `harnesses.ts` implements the harnesses,
and `check.ts` runs them all and reports every violation at once. Add a harness only when no
existing one can express a rule; prefer an Oxlint rule when the check is about JavaScript or
TypeScript syntax.
