import { render } from '@groam/vitest-config/react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { testIds } from '@/lib/test-ids';
import { TripPlanPanel } from './trip-plan-panel';

vi.mock('@/features/trips/trip-plan/trip-your-turn', () => ({
  TripYourTurn: () => <p>your turn strip</p>
}));
vi.mock('@/features/trips/trip-planner/trip-day-planner', () => ({
  TripDayPlanner: ({ onFlag }: { onFlag?: (about: unknown) => void }) => (
    <div>
      <p>day planner</p>
      {onFlag ? (
        <button
          onClick={() =>
            onFlag({
              label: 'Museum',
              subject: { id: 'a-1', type: 'activity' },
              topic: 'Museum'
            })
          }
          type="button"
        >
          flag museum
        </button>
      ) : null}
    </div>
  )
}));
const navigate = vi.hoisted(() => vi.fn());
vi.mock('@/lib/navigation/router', async (importOriginal) => {
  const { mockRouter } = await import('@/lib/testing/router-mock');
  return mockRouter(importOriginal, navigate);
});
const create = vi.hoisted(() => vi.fn());
vi.mock('@/features/issues/hooks/use-workspace-issues', () => ({ useCreateIssue: () => create }));
vi.mock('@/features/issues/hooks/use-generate-rule', () => ({ useGenerateRule: () => vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  create.mockResolvedValue('issue-9');
});

const trip = {
  archivedAt: null,
  currency: 'USD',
  id: 'trip-1',
  initialBudget: null,
  permissions: { canEdit: false },
  totalPlannedCost: 0
} as unknown as TripDetail;

test('reads the plan day by day under the your turn strip, with no view switch', async () => {
  await render(<TripPlanPanel trip={trip} />);
  await expect.element(page.getByTestId(testIds.tripPlanPage)).toBeVisible();
  await expect.element(page.getByText('your turn strip')).toBeVisible();
  await expect.element(page.getByText('day planner')).toBeVisible();
  await expect.element(page.getByRole('group', { name: 'Plan view' })).not.toBeInTheDocument();
});

test('flagging a card opens the issue dialog about it and lands on the new issue', async () => {
  await render(<TripPlanPanel trip={trip} />);
  await page.getByRole('button', { name: 'flag museum' }).click();
  await expect
    .element(page.getByTestId(testIds.createIssueAbout))
    .toHaveTextContent('About Museum');
  await expect
    .element(page.getByTestId(testIds.createIssueTitle))
    .toHaveValue('Question about Museum');
  await page.getByTestId(testIds.createIssueBody).fill('Is it open on Monday?');
  await page.getByRole('button', { name: 'Create issue' }).click();
  expect(create).toHaveBeenCalledWith('trip-1', 'Question about Museum', 'Is it open on Monday?', {
    subject: { id: 'a-1', type: 'activity' }
  });
  expect(navigate).toHaveBeenCalledWith({ params: { issueId: 'issue-9' }, to: '/issues/$issueId' });
});

test('an archived trip cannot be flagged', async () => {
  await render(<TripPlanPanel trip={{ ...trip, archivedAt: 1 } as TripDetail} />);
  await expect.element(page.getByText('day planner')).toBeVisible();
  await expect.element(page.getByRole('button', { name: 'flag museum' })).not.toBeInTheDocument();
});
