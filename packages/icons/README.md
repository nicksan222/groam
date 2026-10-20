# Icons

`@groam/icons` owns the icon catalog for Groam apps and packages. Consumers declare
it as a workspace dependency and use named exports:

```tsx
import { Check, MapPin } from '@groam/icons';
import type { Icon, IconProps } from '@groam/icons';
```

The React entrypoint explicitly re-exports approved Lucide icons, preserving their
props, refs, accessible labels, and tree shaking. Add a named export in
`src/index.ts` when another icon is needed. Keep provider dependencies here.

The landing site's existing custom artwork is available without loading React:

- `@groam/icons/astro`: Astro `Icon` component, with a `name` and optional `class` and `filled` props.
- `@groam/icons/lost-pin`: the decorative pin used by the missing-page animation.
- `@groam/icons/names`: the `IconName` type for that component.
- `@groam/icons/markup`: static reaction icons and the issue check for DOM markup.

`groam/no-raw-icons` rejects direct provider imports and re-exports (including
subpaths, dynamic imports, and `require`), inline JSX SVG, and SVG markup strings
in app and package JavaScript/TypeScript, including tests. The icons package is
the permitted implementation boundary. Brand artwork belongs to `@groam/brand`.
`lint:conventions` enforces the same boundary for Astro templates. Non-icon SVG
illustrations in Astro must carry `data-illustration`.
