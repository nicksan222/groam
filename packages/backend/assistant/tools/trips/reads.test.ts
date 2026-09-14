import { expect, test, vi } from 'vitest';

vi.mock('@convex-dev/agent', () => ({
  createTool: <Definition>(definition: Definition) => definition
}));

import {
  createGetItineraryTool,
  createGetTripStatusTool
} from '#backend/assistant/tools/trips/reads';

const tripContext = {
  archived: false,
  canEdit: false,
  costTargets: [],
  currency: 'EUR',
  dateNotes: null,
  destinations: [],
  groupMemberCount: 3,
  initialBudget: null,
  primaryDestination: 'Lisbon',
  proposalStatus: null,
  startDate: '2027-01-01',
  totalDurationDays: 5,
  totalPlannedCost: 0,
  tripName: 'Portugal'
};

function queryContext() {
  return { runQuery: async () => tripContext };
}

test('reads an itinerary with a mocked query', async () => {
  const tool = createGetItineraryTool('trip-1' as never) as unknown as {
    execute: (ctx: unknown, input: unknown) => Promise<unknown>;
  };
  await expect(tool.execute(queryContext(), {})).resolves.toEqual({
    itinerary: expect.objectContaining({ tripName: 'Portugal' })
  });
});

test('reads trip status with a mocked query', async () => {
  const tool = createGetTripStatusTool('trip-1' as never) as unknown as {
    execute: (ctx: unknown, input: unknown) => Promise<unknown>;
  };
  await expect(tool.execute(queryContext(), {})).resolves.toEqual({
    status: expect.objectContaining({ tripName: 'Portugal' })
  });
});
