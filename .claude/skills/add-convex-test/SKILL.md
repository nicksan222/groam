---
name: add-convex-test
description: >-
  Add a convex-test for Groam backend behavior using the shared factory and
  real public routes. Use when testing a mutation, query, authz denial, or
  itinerary write — never mock procedures, auth, or component calls.
---

# Add a Convex test

Colocate `*.test.ts` next to the module under
`packages/backend/convex/modules/...`. Convex excludes `*.test.ts` from
production deploys.

## Setup

Use `#testing/trips` (or `#testing/factory`) so Better Auth, Agent, and Rate
Limiter run for real:

```ts
import { expect, test } from 'vitest';
import { api } from '#convex-generated/api';
import { setupWritableTrip, tripActivityInput, tripLocationInput } from '#testing/trips';

test('adds ordered activities to a scheduled destination', { timeout: 15_000 }, async () => {
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
    destinations: [{ activities: [{ id: activityId, dayNumber: 2 }] }]
  });
});
```

Drive the **public** `api.routes.*.run` as authenticated users. Add a second
member (or outsider) and assert the negative authz case.

## Rules

- Do not mock procedures, auth state, storage, or component calls.
- Agent model doubles belong only in colocated `*.test.ts`. They replace the
  provider response; the real Agent loop still runs tools and persists
  messages.
- `ctx.db` stays in modules/routes; tests go through `client.query` /
  `client.mutation`.
- Timeouts: 15s is the usual floor for authenticated fixtures.

Shared helpers: `#testing/trips`, `#testing/versions`, `#testing/media`,
`#testing/attachments`. Extend those instead of copying `setupGroup`.
