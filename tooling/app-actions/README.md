# App actions

Groam's reusable action vocabulary and its interchangeable adapters.

```text
src/actions/<verb>.ts  shared input, output, and action type
src/backend/<verb>.ts  raw procedure implementation
src/app-actions.ts     tiny list of supported capabilities
```

To add a backend capability, define its contract in `src/actions/<verb>.ts`,
implement it in `src/backend/<verb>.ts`, and attach it to `AppActions` and
`BackendAppActions`. Browser journey steps live in `src/vitest`.

Callers use `@groam/app-actions/backend` or `@groam/app-actions/vitest`
(view tests and journeys). This package owns how one operation reaches Groam;
it does not own test or seed scenarios.

```ts
import { createBackendActions } from '@groam/app-actions/backend';

const app = createBackendActions({ convexUrl, siteUrl });
const owner = await app.ensureUser(profile);
const tripId = await app.createTrip(owner, { name: 'Lisbon weekend' });
```

`tooling/seeder` owns seed scales, fixtures, plans, batching, and operation
order. It composes only primitives from the backend adapter.

## Browser journeys (Vite+ browser mode)

`@groam/app-actions/vitest` is the driver for `apps/web/e2e/**/*.test.tsx`
journeys, which run under `vp test` against the local Convex backend.

```text
src/vitest/<verb>.ts        steps a user takes, written with Vitest locators
src/vitest/journey-backend  Node-side arrangements (`arrange.*`), one account per test file
src/vitest/commands.ts      browser commands: those arrangements plus browser changes
                            (`environment.*`: clipboard, color scheme, mocked geocoder)
src/testing/                shared by every driver: test ids, accounts, unique names, fixtures
```

A journey has one UI user. Other people act through `arrange.*` and the journey
asserts the screen reacts; their own screens belong to view tests.
