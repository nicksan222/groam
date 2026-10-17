import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { ProposalFeedbackItem } from './proposal-types';
import { VisualChange, type VersionChange } from './visual-change';

function textField(key: string, label: string, before: unknown, after: unknown) {
  return {
    after,
    before,
    display: 'value',
    format: 'text',
    key,
    label,
    mediaAfter: [],
    mediaBefore: []
  };
}

function makeChange(overrides: Record<string, unknown> = {}) {
  return {
    change: 'modified',
    entity: 'activity',
    fields: [textField('notes', 'Notes', 'Early visit', 'Afternoon visit')],
    key: 'museum',
    label: 'Museum visit',
    ...overrides
  } as unknown as VersionChange;
}

const comment = (content: string) =>
  ({ author: { name: 'Ada' }, content, id: content }) as unknown as ProposalFeedbackItem;

describe('VisualChange', () => {
  test.each([
    ['added', 'Added activity'],
    ['removed', 'Removed activity'],
    ['modified', 'Updated activity']
  ])('%s change is summarised as "%s"', async (change, summary) => {
    await render(<VisualChange change={makeChange({ change })} />);
    await expect.element(page.getByText(summary, { exact: false })).toBeVisible();
    await expect.element(page.getByText('1 detail', { exact: false })).toBeVisible();
  });

  test('reads a gear assignment in plain words', async () => {
    await render(
      <VisualChange
        change={makeChange({
          entity: 'packingBringer',
          fields: [textField('count', 'Bringing', '1', '2')],
          label: 'Hair dryer · Ana'
        })}
      />
    );
    await expect.element(page.getByText('Hair dryer · Ana')).toBeVisible();
    await expect.element(page.getByText('Updated gear assignment', { exact: false })).toBeVisible();
    await expect.element(page.getByText('Bringing')).toBeVisible();
  });

  test('shows before and after values', async () => {
    await render(<VisualChange change={makeChange()} />);
    await expect.element(page.getByText('Early visit').first()).toBeInTheDocument();
    await expect.element(page.getByText('Afternoon visit').first()).toBeInTheDocument();
  });

  test('hides fields empty on both sides and pluralises the count', async () => {
    const fields = [
      textField('a', 'Alpha', 'x', 'y'),
      textField('b', 'Bravo', 'p', 'q'),
      textField('c', 'Charlie', null, '')
    ];
    await render(<VisualChange change={makeChange({ fields })} />);
    await expect.element(page.getByText('2 details', { exact: false })).toBeVisible();
    await expect.element(page.getByText('Charlie')).not.toBeInTheDocument();
  });

  test('describes a change without visible fields', async () => {
    await render(<VisualChange change={makeChange({ change: 'removed', fields: [] })} />);
    await expect.element(page.getByText('This activity was removed.')).toBeVisible();
  });

  test('toggle fires and expanded state reflects props', async () => {
    const onToggle = vi.fn();
    const view = await render(<VisualChange change={makeChange()} expanded onToggle={onToggle} />);
    const toggle = page.getByRole('button', { name: 'Collapse Museum visit' });
    await expect.element(toggle).toHaveAttribute('aria-expanded', 'true');
    await toggle.click();
    expect(onToggle).toHaveBeenCalledTimes(1);
    await view.rerender(
      <VisualChange change={makeChange()} expanded={false} onToggle={onToggle} />
    );
    await expect
      .element(page.getByRole('button', { name: 'Expand Museum visit' }))
      .toHaveAttribute('aria-expanded', 'false');
  });

  test('no comment button without onComment', async () => {
    await render(<VisualChange change={makeChange()} />);
    await expect
      .element(page.getByRole('button', { name: 'Comment on Museum visit' }))
      .not.toBeInTheDocument();
  });

  test('opens the composer and sends a comment', async () => {
    const onComment = vi.fn(async () => true);
    await render(<VisualChange change={makeChange()} onComment={onComment} />);
    await page.getByRole('button', { name: 'Comment on Museum visit' }).click();
    await page.getByRole('textbox').fill('Swap the order');
    await page.getByRole('button', { name: 'Add comment' }).click();
    await expect.poll(() => onComment.mock.calls).toEqual([['Swap the order']]);
  });

  test('lists existing comments with a count', async () => {
    await render(
      <VisualChange
        change={makeChange()}
        comments={[comment('First thought'), comment('Second thought')]}
        onComment={vi.fn(async () => true)}
      />
    );
    await expect.element(page.getByText('First thought', { exact: false })).toBeVisible();
    await expect.element(page.getByText('Second thought', { exact: false })).toBeVisible();
    await expect
      .element(page.getByRole('button', { name: 'Comment on Museum visit' }))
      .toHaveTextContent('Comment2');
  });
});
