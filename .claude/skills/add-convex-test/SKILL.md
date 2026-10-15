---
name: add-convex-test
description: >-
  Add a convex-test for Groam backend behavior using the shared #testing
  factory and real public routes. Use when testing a Convex mutation, query,
  action, authz denial, or itinerary write — never mock procedures, auth, or
  component calls.
---

# Add a Convex test

Colocate `<topic>.test.ts` next to the module under
`packages/backend/convex/modules/...` (Convex excludes `*.test.ts` from
deploys). Import test APIs from `vite-plus/test`, not `vitest`.

## Setup

`#testing/trips` and `#testing/factory` run Better Auth, Agent, and Rate
Limiter for real. Drive the **public** `api.routes.*.run` as authenticated
users, and always assert the negative authz case.

```ts
import { expect, test } from 'vite-plus/test';
import { api } from '#convex-generated/api';
import { createOutsiderClient } from '#testing/factory';
import { setupWritableTrip, tripActivityInput, tripLocationInput } from '#testing/trips';

test('adds an activity to a scheduled destination', { timeout: 15_000 }, async () => {
  const { owner, tripId } = await setupWritableTrip();
  const destinationId = await owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput({ endDay: 3, startDay: 1 }),
    tripId
  });
  const activityId = await owner.client.mutation(api.routes.trips.destinations.activities.add.run, {
    destinationId,
    input: tripActivityInput({ dayNumber: 2, timeBlock: 'afternoon' }),
    tripId
  });
  await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
    destinations: [{ activities: [{ dayNumber: 2, id: activityId }] }]
  });

  const outsider = await createOutsiderClient(owner.test);
  await expect(outsider.client.query(api.routes.trips.get.run, { tripId })).rejects.toThrow(
    'Trip not found'
  );
});
```

- `setupGroup()` → owner + `addUser(name, role)`; `setupTrip()` → shared
  trip with members; `setupWritableTrip()` → an open draft idea whose
  `tripId` is the working copy (`sharedTripId` is the original).
- Other helpers: `#testing/versions`, `#testing/media`,
  `#testing/attachments`. Extend them instead of copying setup code.

## Rules

- Do not mock procedures, auth state, storage, or component calls.
- Agent model doubles live only in colocated `*.test.ts`; they replace the
  provider response while the real Agent loop runs tools and persists
  messages.
- Tests go through `client.query` / `client.mutation` / `client.action`;
  `ctx.db` stays in modules and routes.
- Use `{ timeout: 15_000 }` as the floor for authenticated fixtures.
- Scheduled functions wait on fake timers; drive them with
  `finishAllScheduledFunctions(vi.runAllTimers)` or call `vi.useRealTimers()`.
- Console output fails the test unless declared with `expectConsole(level,
  pattern)` from `@groam/vitest-config/console`.

## Run

From `packages/backend`: `vp test run convex/modules/<area>/<domain>/<topic>.test.ts`.
Whole repo: `just test`.
