import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import type { IdeaStatus } from '@/types/ideas';
import { IdeaWorkspaceHeading } from './idea-workspace-heading';

vi.mock('@/features/ideas/hooks/use-idea-context', () => ({
  useOptionalIdeaContext: () => ({
    proposal: { title: 'A coastal detour', conflicts: [] },
    sharedTrip: { name: 'Portugal week' }
  })
}));

test.each([
  [true, false, 'draft', 'Editing idea'],
  [false, false, 'draft', 'Viewing idea · Read-only'],
  [false, false, 'in_review', 'Viewing idea · Read-only'],
  [false, false, 'merged', 'Viewing idea · Read-only'],
  [false, false, 'closed', 'Viewing idea · Read-only'],
  [true, true, 'draft', 'Reviewing changes']
] as const)(
  'labels permissions and review mode: %s %s %s',
  async (canEdit, reviewing, status: IdeaStatus, label) => {
    const trip = {
      id: 'working-trip',
      name: 'Portugal week',
      permissions: { canEdit }
    } as TripDetail;
    await render(
      <IdeaWorkspaceHeading
        actions={null}
        reviewing={reviewing}
        status={status}
        trip={trip}
        tripId={trip.id}
      />
    );
    await expect.element(page.getByText(label)).toBeInTheDocument();
    await expect.element(page.getByText('A coastal detour')).toBeInTheDocument();
    await expect.element(page.getByText('An idea for Portugal week')).toBeInTheDocument();
  }
);
