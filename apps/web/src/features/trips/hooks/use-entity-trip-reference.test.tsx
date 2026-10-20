import { api } from '@groam/backend/api';
import { renderHook } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { useEntityTripReference } from './use-entity-trip-reference';

const query = vi.hoisted(() => vi.fn());
vi.mock('convex/react', () => ({ useQuery: query }));

test.each(['tripProposals', 'tripIssues', 'discussions', 'agentRuns'] as const)(
  'resolves %s through preview-safe metadata',
  async (table) => {
    const reference = { id: 'entity', shortId: 'abcdef', tripId: 'trip' };
    query.mockReturnValue(reference);
    const { result } = await renderHook(() => useEntityTripReference(table, 'entity'));
    expect(result.current).toEqual(reference);
    expect(query).toHaveBeenLastCalledWith(api.routes.references.resolve.run, {
      table,
      reference: 'entity'
    });
  }
);
