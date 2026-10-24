import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { testIds } from '@/lib/test-ids';
import { CreateIssueDialog } from './create-issue-dialog';

const create = vi.hoisted(() => vi.fn());
vi.mock('@/features/issues/hooks/use-workspace-issues', () => ({ useCreateIssue: () => create }));

const tripId = 'trip-1' as Id<'trips'>;
const issueId = 'issue-1' as Id<'tripIssues'>;

async function fillAndSubmit() {
  await page.getByTestId(testIds.createIssueTitle).fill('Book flights');
  await page.getByTestId(testIds.createIssueBody).fill('We need to book them.');
  await page.getByRole('button', { name: 'Create issue' }).click();
}

beforeEach(() => {
  vi.clearAllMocks();
  create.mockResolvedValue(issueId);
});

const generate = vi.hoisted(() => vi.fn());
vi.mock('@/features/issues/hooks/use-generate-rule', () => ({ useGenerateRule: () => generate }));

describe('CreateIssueDialog', () => {
  test('creates an issue without a rule by default', async () => {
    const onCreated = vi.fn();
    await render(
      <CreateIssueDialog onClose={vi.fn()} onCreated={onCreated} open tripId={tripId} />
    );
    await expect.element(page.getByText('No rule yet')).toBeVisible();
    await fillAndSubmit();
    expect(create).toHaveBeenCalledWith(tripId, 'Book flights', 'We need to book them.', {});
    expect(onCreated).toHaveBeenCalledWith(issueId);
  });

  test('builds a rule the system checks and sends it', async () => {
    await render(<CreateIssueDialog onClose={vi.fn()} onCreated={vi.fn()} open tripId={tripId} />);
    await page.getByTestId(testIds.ruleAddCondition).click();
    await page.getByTestId(testIds.ruleAddCondition).click();
    await page.getByTestId(testIds.ruleClauseKind).nth(1).click();
    await page.getByRole('option', { name: 'Within budget' }).click();
    await fillAndSubmit();
    expect(create).toHaveBeenCalledWith(tripId, 'Book flights', 'We need to book them.', {
      rule: {
        items: [
          expect.objectContaining({ kind: 'daily_activities' }),
          expect.objectContaining({ kind: 'within_budget' })
        ],
        match: 'all'
      }
    });
  });

  test('drafts the rule from a sentence with the magic button', async () => {
    generate.mockResolvedValue({
      items: [{ kind: 'within_budget' }, { kind: 'packing_packed' }],
      match: 'all'
    });
    await render(<CreateIssueDialog onClose={vi.fn()} onCreated={vi.fn()} open tripId={tripId} />);
    await page.getByTestId(testIds.ruleMagicInput).fill('stay on budget and pack everything');
    await page.getByTestId(testIds.ruleMagicSubmit).click();
    await expect.poll(() => page.getByTestId(testIds.ruleClause).all().length).toBe(2);
    expect(generate).toHaveBeenCalledWith('stay on budget and pack everything');
    await fillAndSubmit();
    expect(create).toHaveBeenCalledWith(tripId, 'Book flights', 'We need to book them.', {
      rule: { items: [{ kind: 'within_budget' }, { kind: 'packing_packed' }], match: 'all' }
    });
  });

  test('about a plan item: shows it, prefills the title and sends the subject', async () => {
    const subject = { id: 'activity-1', type: 'activity' } as never;
    await render(
      <CreateIssueDialog
        about={{ label: 'Fado night', subject, topic: 'Fado night' }}
        onClose={vi.fn()}
        onCreated={vi.fn()}
        open
        tripId={tripId}
      />
    );
    await expect
      .element(page.getByTestId(testIds.createIssueAbout))
      .toHaveTextContent('About Fado night');
    await expect
      .element(page.getByTestId(testIds.createIssueTitle))
      .toHaveValue('Question about Fado night');
    await page.getByTestId(testIds.createIssueBody).fill('Is it still on?');
    await page.getByRole('button', { name: 'Create issue' }).click();
    expect(create).toHaveBeenCalledWith(tripId, 'Question about Fado night', 'Is it still on?', {
      subject
    });
  });

  test('without a subject there is no About line', async () => {
    await render(<CreateIssueDialog onClose={vi.fn()} onCreated={vi.fn()} open tripId={tripId} />);
    await expect.element(page.getByTestId(testIds.createIssueTitle)).toHaveValue('');
    await expect.element(page.getByTestId(testIds.createIssueAbout)).not.toBeInTheDocument();
  });

  test('a transfer asks about its topic, and a stay names the stay', async () => {
    const subject = { id: 'transfer-1', type: 'activity_transfer' } as never;
    await render(
      <CreateIssueDialog
        about={{ label: 'Taxi · Fado night → Museum', subject, topic: 'the taxi to Museum' }}
        onClose={vi.fn()}
        onCreated={vi.fn()}
        open
        tripId={tripId}
      />
    );
    await expect
      .element(page.getByTestId(testIds.createIssueAbout))
      .toHaveTextContent('About Taxi · Fado night → Museum');
    await expect
      .element(page.getByTestId(testIds.createIssueTitle))
      .toHaveValue('Question about the taxi to Museum');
  });

  test('a flagged question needs no description', async () => {
    const subject = { id: 'stay-1', type: 'stay' } as never;
    await render(
      <CreateIssueDialog
        about={{ label: 'Casa do Pátio', subject, topic: 'Casa do Pátio' }}
        onClose={vi.fn()}
        onCreated={vi.fn()}
        open
        tripId={tripId}
      />
    );
    await expect
      .element(page.getByTestId(testIds.createIssueAbout))
      .toHaveTextContent('About Casa do Pátio');
    await expect.element(page.getByText("What's the question?", { exact: false })).toBeVisible();
    await page.getByRole('button', { name: 'Create issue' }).click();
    expect(create).toHaveBeenCalledWith(tripId, 'Question about Casa do Pátio', '', { subject });
  });
});
