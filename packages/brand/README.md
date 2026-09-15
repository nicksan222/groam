# `@groam/brand`

Groam's visual identity has one source of truth: [`src/identity.json`](src/identity.json).
The React mark and every checked-in SVG, web icon, desktop icon, and repository image are
derived from that manifest.

```bash
bun run --cwd packages/brand generate
```

Use `@groam/brand/mark` in React. Use the generated files under `assets/` for documents
and non-React surfaces. Do not redraw or copy the logo geometry elsewhere.
