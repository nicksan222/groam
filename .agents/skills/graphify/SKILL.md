---
name: graphify
description: Use for questions about Groam's architecture, symbols, call paths, ownership, or cross-file code relationships.
---

# Graphify for Groam

Graphify is an optional local call/import index. Discover the current
`graphify-*` recipes in `Justfile` and the implementation under
`tooling/graphify/` before using it. Check that the tools are available in the
active runtime; use `AGENTS.md` for host/container detection.

- Start with `rg` to discover an exact symbol. Graph matching uses labels, not
  semantic questions. Use the available explain, affected, path, or query recipe
  for the relationship you need and inspect its current arguments/help.
- Refresh through the maintained recipe before relying on results. An index can
  still be incomplete or stale; inspect reported source paths and actual code.
- Check `tooling/graphify/exclude.txt` for coverage. Use `rg` for excluded files,
  literal strings, Markdown, configs, tests, and missing or ambiguous results.
- A directed path represents calls/imports; an undirected fallback may only
  connect through a shared importer. Treat graph results as investigation leads,
  not proof of runtime flow or authorization.

If graphify or its runtime is unavailable, continue with `rg`, file reads, and
ordinary reference tracing. Do not install harness hooks or commit generated
`graphify-out/` artifacts to answer an architecture question.
