import type { Id } from '@groam/backend/data-model';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { IdeaCloneHeaderActions } from './idea-clone-header-actions';

const navigate = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate
}));

vi.mock('@groam/ui/components/dropdown-menu', async () => {
  const { dropdownMenuTestMock } = await import('@/lib/test-mocks/dropdown-menu');
  return dropdownMenuTestMock;
});

const proposalId = 'proposal-1' as Id<'tripProposals'>;
const sharedTripId = 'trip-1' as Id<'trips'>;

function renderActions(overrides: Partial<Parameters<typeof IdeaCloneHeaderActions>[0]> = {}) {
  const onOpenShared = vi.fn();
  const onPrimary = vi.fn();
  render(
    <IdeaCloneHeaderActions
      canEdit
      onEdit={vi.fn()}
      onOpenShared={onOpenShared}
      onPrimary={onPrimary}
      primary={{ intent: 'submit', label: 'Send for review' }}
      proposalId={proposalId}
      sharedTripId={sharedTripId}
      status="draft"
      view="overview"
      {...overrides}
    />
  );
  return { onOpenShared, onPrimary };
}

afterEach(() => {
  cleanup();
  navigate.mockClear();
});

describe('IdeaCloneHeaderActions', () => {
  test('keeps the lifecycle action visible alongside editing and navigation', () => {
    const { onPrimary } = renderActions();

    fireEvent.click(screen.getByTestId('idea-primary-action'));
    expect(onPrimary).toHaveBeenCalled();
    expect(screen.getByTestId('trip-actions')).toBeTruthy();
  });

  test('blocks the primary action while another one is running', () => {
    const { onPrimary } = renderActions({ pending: true });

    fireEvent.click(screen.getByTestId('idea-primary-action'));
    expect(onPrimary).not.toHaveBeenCalled();
  });

  test('drops the primary button when the idea has no next step', () => {
    renderActions({ primary: null, status: 'closed' });

    expect(screen.queryByTestId('idea-primary-action')).toBeNull();
    expect(screen.getByTestId('trip-actions')).toBeTruthy();
  });

  test('keeps open-shared visible and open-changes in the overflow menu', () => {
    const { onOpenShared } = renderActions();

    fireEvent.click(screen.getByTestId('trip-actions'));
    fireEvent.click(screen.getByText('Open changes'));
    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({
        params: { proposalId, tripId: sharedTripId, view: 'compare' }
      })
    );

    fireEvent.click(screen.getByTestId('idea-open-shared'));
    expect(onOpenShared).toHaveBeenCalled();
  });

  test('offers back-to-editing from compare instead of open-changes', () => {
    renderActions({ view: 'compare' });

    fireEvent.click(screen.getByTestId('trip-actions'));
    expect(screen.queryByText('Open changes')).toBeNull();
    fireEvent.click(screen.getByText('Back to editing'));
    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({
        params: { proposalId, tripId: sharedTripId, view: 'itinerary' }
      })
    );
  });
});

test('lets an editor edit details without opening a menu', () => {
  const onEdit = vi.fn();
  renderActions({ onEdit });
  fireEvent.click(screen.getByRole('button', { name: 'Edit details' }));
  expect(onEdit).toHaveBeenCalledOnce();
  expect(screen.getByRole('button', { name: 'Open shared trip' })).toBeTruthy();
});

test('does not offer editing to a read-only viewer', () => {
  renderActions({ canEdit: false });
  expect(screen.queryByRole('button', { name: 'Edit details' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Open shared trip' })).toBeTruthy();
});
