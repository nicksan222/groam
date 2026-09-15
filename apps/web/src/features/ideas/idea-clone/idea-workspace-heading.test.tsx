import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import type { IdeaStatus } from '@/types/ideas';
import { IdeaWorkspaceHeading } from './idea-workspace-heading';

vi.mock('@/features/ideas/hooks/use-idea-context', () => ({
  useOptionalIdeaContext: () => ({
    proposal: { title: 'A coastal detour', conflicts: [] },
    sharedTrip: { name: 'Portugal week' }
  })
}));

afterEach(cleanup);

test.each([
  [true, false, 'draft', 'Editing idea'],
  [false, false, 'draft', 'Viewing idea · Read-only'],
  [false, false, 'in_review', 'Viewing idea · Read-only'],
  [false, false, 'merged', 'Viewing idea · Read-only'],
  [false, false, 'closed', 'Viewing idea · Read-only'],
  [true, true, 'draft', 'Reviewing changes']
] as const)(
  'labels permissions and review mode: %s %s %s',
  (canEdit, reviewing, status: IdeaStatus, label) => {
    const trip = {
      id: 'working-trip',
      name: 'Portugal week',
      permissions: { canEdit }
    } as TripDetail;
    render(
      <IdeaWorkspaceHeading
        actions={null}
        reviewing={reviewing}
        status={status}
        trip={trip}
        tripId={trip.id}
      />
    );
    expect(screen.getByText(label)).toBeTruthy();
    expect(screen.getByText('A coastal detour')).toBeTruthy();
    expect(screen.getByText('An idea for Portugal week')).toBeTruthy();
  }
);
