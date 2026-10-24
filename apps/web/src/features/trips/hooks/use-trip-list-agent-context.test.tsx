import { renderHook } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import type { TripListItem } from '@/features/trips/hooks/use-trips';
import { useTripListAgentContext } from './use-trip-list-agent-context';

const setContext = vi.hoisted(() => vi.fn());
vi.mock('@groam/ai/ui/context/agent-context', () => ({ useSetAgentContext: setContext }));

describe('useTripListAgentContext', () => {
  test('describes visible trips with archive state', async () => {
    const trip = {
      archivedAt: 1,
      dateNotes: null,
      destination: 'Lisbon',
      id: 'trip-1',
      name: 'Atlantic week',
      nextAction: 'Plan'
    } as unknown as TripListItem;
    await renderHook(() =>
      useTripListAgentContext({
        activeGroup: 'Acme',
        trips: [trip]
      })
    );
    expect(setContext).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          activeGroup: 'Acme',
          trips: [expect.objectContaining({ archived: true, id: 'trip-1' })]
        },
        key: 'trips:list'
      })
    );
  });
});
