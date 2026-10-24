import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import { afterEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { IdeaCloneHeaderActions } from './idea-clone-header-actions';

const navigate = vi.fn();

vi.mock('@/lib/navigation/router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/navigation/router')>()),
  useNavigate: () => navigate
}));

const proposalId = 'proposal-1' as Id<'tripProposals'>;
const sharedTripId = 'trip-1' as Id<'trips'>;

async function renderActions(
  overrides: Partial<Parameters<typeof IdeaCloneHeaderActions>[0]> = {}
) {
  const onOpenShared = vi.fn();
  const onPrimary = vi.fn();
  await render(
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
  navigate.mockClear();
});

describe('IdeaCloneHeaderActions', () => {
  test('keeps the lifecycle action visible alongside editing and navigation', async () => {
    const { onPrimary } = await renderActions();

    await page.getByTestId('idea-primary-action').click();
    expect(onPrimary).toHaveBeenCalled();
    await expect.element(page.getByTestId('trip-actions')).toBeInTheDocument();
  });

  test('blocks the primary action while another one is running', async () => {
    const { onPrimary } = await renderActions({ pending: true });

    await expect.element(page.getByTestId('idea-primary-action')).toBeDisabled();
    // Forced: a disabled control must ignore clicks, which is the behavior under test.
    await page.getByTestId('idea-primary-action').click({ force: true });
    expect(onPrimary).not.toHaveBeenCalled();
  });

  test('drops the primary button when the idea has no next step', async () => {
    await renderActions({ primary: null, status: 'closed' });

    await expect.element(page.getByTestId('idea-primary-action')).not.toBeInTheDocument();
    await expect.element(page.getByTestId('trip-actions')).toBeInTheDocument();
  });

  test('keeps open-shared and open-changes in the overflow menu', async () => {
    const { onOpenShared } = await renderActions();

    await page.getByTestId('trip-actions').click();
    await page.getByText('Open changes').click();
    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({
        params: { proposalId, tripId: sharedTripId, view: 'compare' }
      })
    );

    await page.getByTestId('trip-actions').click();
    await page.getByTestId('idea-open-shared').click();
    expect(onOpenShared).toHaveBeenCalled();
  });

  test('offers back-to-editing from compare instead of open-changes', async () => {
    await renderActions({ view: 'compare' });

    await page.getByTestId('trip-actions').click();
    await expect.element(page.getByText('Open changes')).not.toBeInTheDocument();
    await page.getByText('Back to editing').click();
    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({
        params: { proposalId, tripId: sharedTripId, view: 'itinerary' }
      })
    );
  });
});

test('puts edit details in the menu beside exactly one primary button', async () => {
  const onEdit = vi.fn();
  await renderActions({ onEdit });
  await expect.element(page.getByRole('button', { name: 'Edit details' })).not.toBeInTheDocument();
  await expect
    .element(page.getByRole('button', { name: 'Open shared trip' }))
    .not.toBeInTheDocument();
  await page.getByTestId('trip-actions').click();
  await page.getByRole('menuitem', { name: 'Edit details' }).click();
  expect(onEdit).toHaveBeenCalledOnce();
});

test('does not offer editing to a read-only viewer', async () => {
  await renderActions({ canEdit: false });
  await page.getByTestId('trip-actions').click();
  await expect
    .element(page.getByRole('menuitem', { name: 'Edit details' }))
    .not.toBeInTheDocument();
  await expect
    .element(page.getByRole('menuitem', { name: 'Open shared trip' }))
    .toBeInTheDocument();
});
