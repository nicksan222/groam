# Oxc configuration

`fmt.ts` (Oxfmt) and `lint.ts` (Oxlint) hold the shared formatter and linter policy. The
repository-root `vite.config.ts` composes them, and `vp check` runs both. Rules for parts of the
repository are scoped with `lint.overrides`.

`plugin/` is the `groam` Oxlint JS plugin: Groam-specific guardrails and ports of Biome rules that
Oxlint has no built-in equivalent for.

## Pattern rules: definition files

A rule that only reports syntax whose source text matches a pattern is one JSON file in
`plugin/patterns/`; the file name is the rule name (`groam/<name>`). Adding or removing one needs
no code: the plugin registers it, `lint.ts` enables it in its own `files`/`excludeFiles` scope,
and `patterns.test.ts` lints its `examples`.

```jsonc
// plugin/patterns/no-direct-sonner-imports.json
{
  "$schema": "../pattern.schema.json",
  "match": "module-source",            // or "node-text" with "nodes": ["CallExpression", ...]
  "pattern": "sonner",                 // must match the whole specifier or node text
  "message": "Import toast from @groam/ui/components/toast ...",
  "files": ["**/apps/web/src/**"],
  "excludeFiles": ["**/apps/web/src/**/*.test.tsx"],
  "examples": [
    { "file": "apps/web/src/features/x/view.tsx", "source": "import { toast } from 'sonner';", "reports": true },
    { "file": "apps/web/src/features/x/view.tsx", "source": "import { toast } from '@groam/ui/components/toast';", "reports": false }
  ]
}
```

Loading states: `no-skeleton-loading` and `no-custom-loading-ui` keep `apps/web` pages and
features on `PageLoading` from `@groam/ui/components/page-loading` and ban skeletons, `List.Loading`,
`Shell.HeaderSkeleton`, `LoadingPlaceholder`, and `*Skeleton`/`*Loading` components and modules
(a `Button` `pending` spinner and a pulsing live-status dot stay allowed).

[`pattern.schema.json`](plugin/pattern.schema.json) types the format for editors; the plugin
validates every definition when it loads.

## Rules with logic

| Rule | Guardrail |
| --- | --- |
| `no-raw-icons` | Keeps icon providers, types, and inline JSX SVG behind `@groam/icons` (brand artwork stays in `@groam/brand`) |
| `no-raw-internal-anchors` | Keeps internal navigation in the typed Void router wrappers |
| `shell-columns` | Protects shared page-column composition and geometry |
| `planning-page-body` | Protects the shared planning page canvas |
| `cognitive-complexity` | Keeps functions at or below a cognitive complexity of 15 |
| `max-lines` | Keeps feature source files under 300 non-blank lines |
| `max-lines-per-function` | Keeps TSX functions under 250 non-blank lines |
| `no-form-in-raw-dialog` | Keeps modal forms on `FormDialog` instead of a `Form` nested in a `Dialog`/`AlertDialog` (imports are resolved, so aliases and `Dialog.Content` count; sheets are exempt; a form rendered from another file is invisible to the rule) |
| `no-hand-rolled-pending` | Keeps busy state on `useFormSubmit`/`useAsyncAction`: flags a `useState`/`useRef` flag set before an `await` (or `.then`/`.finally`) and cleared after it, whatever it is called |
| `no-manual-draft-reset` | Keeps draft resets on `useOpenSession` instead of an effect keyed on `open`, `isOpen`, `*Open`, or `props.open` that resets state (`setX`, `reset()`, `dispatch({ type: 'reset' })`) directly in its body |
| `no-optional-copy` | Keeps "(optional)", "[optional]", and copy opening with "Optional" out of JSX text, copy attributes, and string children; use the `optional` prop |
| `no-pending-copy` | Keeps "Saving…" style copy out of buttons and out of conditionals on a pending flag; use `Button` `pending` (live-region status text is exempt) |
| `no-spinner-in-button` | Keeps `<Spinner>` out of `Button`; use `Button` `pending` |
| `page-renders-view` | Keeps every workspace page on a feature `*View` from a `*-view` module (or a bare `<Navigate>` redirect), so the assistant's screen context is registered |
| `view-registers-agent-context` | Requires each `*-view.tsx` file to export its `*View` and register the screen context exactly once, in one of its top-level components |
| `agent-context-owner` | Keeps screen-context registration in a page view's components or a `use*AgentContext` hook (which registers once), and page views rendered only by pages |
| `no-delete` | Avoids the `delete` operator outside map-like objects |
| `no-re-export-all` | Keeps public entrypoints on explicit exports |
| `use-semantic-elements` | Prefers semantic DOM elements over ARIA roles |

The form guardrails (the six form rows above) apply to `apps/web/src/features` and
`packages/ai/src/ui`, tests excluded; their fixtures are in `forms.test.ts`. They share the
pending vocabulary in `plugin/rules/form-ast.ts`. See the `build-form` skill.

The rules in this table live in `plugin/rules/` and are scoped by hand in `lint.ts`. Write one only when a
pattern definition cannot express the check; give its diagnostic an actionable replacement and
add accepted and rejected fixtures beside the other `*.test.ts` files here. Suppress a single
finding with `// oxlint-disable-next-line <rule> -- <reason>`.

Import boundaries use the built-in `no-restricted-imports` (`noParentImports`, `backendEnvImports`,
`pageImports` in `lint.ts`; fixtures in `imports.test.ts`). Rules Oxlint cannot express (file and
folder names, CSS, Astro templates, cross-file checks) are definition files in
[`tooling/quality/conventions`](../quality/README.md).
