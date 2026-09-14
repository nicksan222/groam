# App actions

Groam's reusable action vocabulary and its interchangeable adapters.

```text
src/actions/<verb>.ts             shared input, output, and action type
src/backend/<verb>.ts             raw procedure implementation
src/playwright/actions/<verb>.ts  browser implementation
src/app-actions.ts                tiny list of supported capabilities
```

To add a capability, create the same `<verb>.ts` in those three directories and
attach it to `AppActions`, `BackendAppActions`, and `PlaywrightAppActions`. The
conventions check rejects incomplete adapter pairs.

Callers only use `@groam/app-actions/backend` or
`@groam/app-actions/playwright`. This package owns how one operation reaches
Groam; it does not own test, seed, or showcase scenarios. Reusable browser
journeys are shared by web E2E tests and showcase films.

```ts
import { createBackendActions } from '@groam/app-actions/backend';

const app = createBackendActions({ convexUrl, siteUrl });
const owner = await app.ensureUser(profile);
const tripId = await app.createTrip(owner, { name: 'Lisbon weekend' });
```

`tooling/seeder` owns seed scales, fixtures, plans, batching, and operation
order. It composes only primitives from the backend adapter.

Browser callers choose their adapter the same way:

```ts
import { createPlaywrightActions } from '@groam/app-actions/playwright';

const app = createPlaywrightActions();
await app.createTrip(page, { name: 'Lisbon weekend' });
```
