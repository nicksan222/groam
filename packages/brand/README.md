# `@groam/brand`

Groam's visual identity has one source of truth: [`src/identity.json`](src/identity.json).
The React mark and every checked-in SVG, web icon, and repository image are
derived from that manifest.

The mark is two pins on one spot: a white pin for the people planning and a cyan pin
behind it for the agent, on a Tokyo blue tile. The gap between them is a mask, so the
`monochrome` variant stays correct on any background.

```bash
vp run --filter @groam/brand generate
```

Use `@groam/brand/mark` in React. Use the generated files under `assets/` for documents
and non-React surfaces. Do not redraw or copy the logo geometry elsewhere.
