import type { Id } from '@groam/backend/data-model';
import { expect, test, vi } from 'vite-plus/test';
import { createTripNavigation } from './trip-detail-navigation';

function navigation(tripId: string) {
  const navigate = vi.fn();
  const subject = createTripNavigation({
    confirm: vi.fn(),
    ideaFlow: {} as never,
    navigate: navigate as never,
    trip: { id: 'full-id' as Id<'trips'> } as never,
    tripId
  });
  return { navigate, subject };
}

test('switches sections with the trip reference as the URL writes it', () => {
  const { navigate, subject } = navigation('niszvl');
  subject.openSection('issues');
  // A full id here would make the reference provider redirect to the short id and remount the page.
  expect(navigate).toHaveBeenCalledWith({
    params: { section: 'issues', tripId: 'niszvl' },
    search: {},
    to: '/trips/$tripId/$section'
  });
});
