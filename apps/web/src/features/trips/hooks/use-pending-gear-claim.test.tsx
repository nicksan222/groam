import { renderHook } from '@groam/vitest-config/react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { usePendingGearClaimStore } from '@/lib/stores/pending-gear-claim-store';
import { usePendingGearClaim } from './use-pending-gear-claim';

const notifications = vi.hoisted(() => Object.assign(vi.fn(), { error: vi.fn() }));
vi.mock('@groam/ui/components/toast', () => ({ toast: notifications }));

const bring = vi.fn();
const tent = {
  bringers: [{ count: 2, image: null, name: 'Me', userId: 'me' }],
  brought: 2,
  id: 'item-1',
  label: 'Tent',
  quantity: 3
};
const packing = (items: unknown[] = [tent], isLoading = false) =>
  ({ bring, isLoading, items }) as never;

beforeEach(() => {
  vi.clearAllMocks();
  usePendingGearClaimStore
    .getState()
    .setClaim({ label: 'tent', proposalId: 'idea-1' as never, sourceTripId: 'trip-1' as never });
});

test('raises the viewer count by one for the idea the claim was made for', async () => {
  await renderHook(() =>
    usePendingGearClaim({
      editable: true,
      packing: packing(),
      proposalId: 'idea-1',
      viewerUserId: 'me'
    })
  );
  expect(bring).toHaveBeenCalledWith('item-1', 'me', 3);
  expect(usePendingGearClaimStore.getState().claim).toBeNull();
});

test('waits while the copy loads and ignores other ideas', async () => {
  await renderHook(() =>
    usePendingGearClaim({
      editable: true,
      packing: packing([], true),
      proposalId: 'idea-1',
      viewerUserId: 'me'
    })
  );
  await renderHook(() =>
    usePendingGearClaim({
      editable: true,
      packing: packing(),
      proposalId: 'idea-2',
      viewerUserId: 'me'
    })
  );
  expect(bring).not.toHaveBeenCalled();
  expect(usePendingGearClaimStore.getState().claim).not.toBeNull();
});

test('applies nothing without edit rights', async () => {
  await renderHook(() =>
    usePendingGearClaim({
      editable: false,
      packing: packing(),
      proposalId: 'idea-1',
      viewerUserId: 'me'
    })
  );
  expect(bring).not.toHaveBeenCalled();
});
