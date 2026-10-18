import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { testIds } from '@/lib/test-ids';
import type { IdeaStatus } from '@/types/ideas';
import type { IdeaRebaseConflict, IdeaRebaseResult } from '@/types/trips';
import { IdeaUpdateFlow } from './idea-update-flow';

const conflicts = [
  {
    currentFields: ['dates'],
    currentSummary: 'Aug 1 to Aug 5',
    key: 'details',
    label: 'Trip dates',
    proposedFields: ['dates'],
    proposedSummary: 'Aug 2 to Aug 6'
  },
  {
    currentFields: ['name'],
    currentSummary: 'Atlantic week',
    key: 'name',
    label: 'Trip name',
    proposedFields: ['budget'],
    proposedSummary: 'Atlantic week 2'
  }
] as unknown as IdeaRebaseConflict[];

const needsChoices = { conflicts, kind: 'needs_choices' } as unknown as IdeaRebaseResult;
const applied = { kind: 'applied' } as IdeaRebaseResult;

type Props = Partial<Parameters<typeof IdeaUpdateFlow>[0]>;

function renderFlow(props: Props = {}) {
  const onRebase = vi.fn().mockResolvedValue(needsChoices);
  const view = render(
    <IdeaUpdateFlow
      canRebase
      disabled={false}
      onRebase={props.onRebase ?? onRebase}
      pending={false}
      sourceChanged
      status="in_review"
      {...props}
    />
  );
  return { onRebase: props.onRebase ?? onRebase, view };
}

const entry = () => page.getByTestId(testIds.ideaUpdateFromShared);

describe('IdeaUpdateFlow entry', () => {
  test.each<[string, Props, boolean]>([
    ['source changed, in review', { sourceChanged: true, status: 'in_review' }, true],
    ['source changed, draft', { sourceChanged: true, status: 'draft' }, true],
    ['conflicted without source change', { sourceChanged: false, status: 'conflicted' }, true],
    ['source unchanged', { sourceChanged: false, status: 'in_review' }, false],
    ['merged', { sourceChanged: true, status: 'merged' as IdeaStatus }, false],
    ['closed', { sourceChanged: true, status: 'closed' as IdeaStatus }, false]
  ])('%s', async (_, props, visible) => {
    await renderFlow(props).view;
    if (visible) {
      await expect
        .element(page.getByText('The shared trip has changed since you started'))
        .toBeVisible();
      await expect.element(entry()).toBeVisible();
    } else {
      await expect.element(entry()).not.toBeInTheDocument();
    }
  });

  test.each<[string, Props]>([
    ['disabled', { disabled: true }],
    ['not allowed to rebase', { canRebase: false }]
  ])('disables the update button when %s', async (_, props) => {
    await renderFlow(props).view;
    await expect.element(entry()).toBeDisabled();
  });

  test('explains why the viewer cannot update', async () => {
    await renderFlow({ canRebase: false }).view;
    await expect
      .element(page.getByText('Only the idea author or a group organizer can update this idea.'))
      .toBeVisible();
  });
});

describe('IdeaUpdateFlow reconciliation', () => {
  test('stays on the entry when the update applies without choices', async () => {
    const onRebase = vi.fn().mockResolvedValue(applied);
    await renderFlow({ onRebase }).view;
    await entry().click();
    expect(onRebase).toHaveBeenCalledWith();
    await expect.element(page.getByText('Choose what to keep')).not.toBeInTheDocument();
  });

  test('walks through conflicts and applies the chosen resolutions', async () => {
    const onRebase = vi.fn().mockResolvedValueOnce(needsChoices).mockResolvedValueOnce(applied);
    await renderFlow({ onRebase, sourceChanged: false, status: 'conflicted' }).view;
    await entry().click();

    await expect.element(page.getByText('Choose what to keep')).toBeVisible();
    await expect.element(page.getByText('Trip dates')).toBeVisible();
    await expect
      .element(page.getByText('The shared trip and this idea both changed dates.'))
      .toBeVisible();
    await expect
      .element(page.getByText('The shared trip changed name. This idea changed budget.'))
      .toBeVisible();

    const confirm = page.getByRole('button', { name: 'Update idea' });
    await expect.element(confirm).toBeDisabled();

    await page.getByRole('button', { name: 'Keep shared trip' }).first().click();
    await expect.element(confirm).toBeDisabled();
    await page.getByRole('button', { name: 'Keep my idea' }).nth(1).click();
    await expect
      .element(page.getByRole('button', { name: 'Keep shared trip' }).first())
      .toHaveAttribute('aria-pressed', 'true');
    await expect.element(confirm).toBeEnabled();

    await confirm.click();
    await expect
      .poll(() => onRebase.mock.calls[1])
      .toEqual([
        [
          { choice: 'current', path: 'details' },
          { choice: 'proposed', path: 'name' }
        ]
      ]);
    await expect.element(page.getByText('Choose what to keep')).not.toBeInTheDocument();
  });

  test('cancel closes the screen', async () => {
    await renderFlow({ sourceChanged: false, status: 'conflicted' }).view;
    await entry().click();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect.element(page.getByText('Choose what to keep')).not.toBeInTheDocument();
  });

  test('keeps the screen open when applying still reports conflicts', async () => {
    const onRebase = vi.fn().mockResolvedValue(needsChoices);
    await renderFlow({ onRebase }).view;
    await entry().click();
    await page.getByRole('button', { name: 'Keep shared trip' }).first().click();
    await page.getByRole('button', { name: 'Keep shared trip' }).nth(1).click();
    await page.getByRole('button', { name: 'Update idea' }).click();
    await expect.poll(() => onRebase.mock.calls.length).toBe(2);
    await expect.element(page.getByText('Choose what to keep')).toBeVisible();
  });
});
