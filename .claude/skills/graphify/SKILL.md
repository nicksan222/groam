---
name: graphify
description: Use for questions about Groam's architecture, symbols, call paths, ownership, or cross-file code relationships.
---

# Graphify for Groam

A local, code-only call/import graph built by tree-sitter (no API key, no
network) at `graphify-out/graph.json`. Each recipe refreshes it incrementally
first (about 2s, silent unless it fails), so it never goes stale.

## Recipes

```bash
just graphify-explain assertPlanner           # definition site + every direct caller/callee/import
just graphify-affected requireWorkspace       # reverse callers/importers, depth 2 (blast radius)
just graphify-affected requireWorkspace 1     # direct dependents only
just graphify-path assertMutable isTripAdmin  # shortest call/import chain A -> B
just graphify-query "assertPlanner loadTripContext"  # BFS around matching nodes, max 80 lines
just graphify-query "workspaceQuery" 150      # raise the output line cap
```

- Matching is by **node label**, not meaning. Use identifiers (function, type,
  or file names). Prose like "where is authorization enforced?" only matches
  incidental words such as `trip`. Don't know the name yet? `rg` for it first,
  then `explain` or `affected`.
- `explain`, `affected` and `path` resolve the closest label. Check the
  `Source:` line to confirm you got the node you meant. "No node matching"
  means the name is wrong or excluded.
- `path` tries call/import direction first. If no directed path exists, it
  prints an undirected path, which may only pass through a shared importer.

## Reading output

- `NODE <label> [src=<file> loc=L<n>]` is a symbol or file and its location.
  An empty `src` means an external or unresolved reference such as
  `ref_convex_values`.
- `EDGE A --calls|imports|contains--> B at=<file>:L<n>` is a relationship and
  where it happens.
- A `[truncated ...]` or `TRUNCATED` notice means the query was too broad.
  Narrow it to a sharper identifier.

Treat results as leads. Open the cited lines and confirm before you act on them.

## Coverage and fallback

The index is code only. `tooling/graphify/exclude.txt` (gitignore syntax)
leaves out tests (`*.test.ts(x)`, `apps/web/e2e/`), `*.json` manifests,
`_generated/` code, `.claude/`, vendored Rust and media. For anything in those
files, or for exact strings, literals, config keys, CSS and Markdown, use `rg`.
Use `rg` as well when graphify comes back empty or vague.

If `graphify` or `just` is missing, the dev container image is broken. Report
it instead of installing anything. Never commit `graphify-out/`, and never run
`graphify hook install` or `graphify claude install`.
