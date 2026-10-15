import { render } from '@groam/vitest-config/react';
import { type ComponentProps, type ReactNode, useState } from 'react';
import { afterEach, describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { ChangeSummary } from './change-summary';
import type { ProposalFeedbackItem } from './proposal-types';

// The trip page switches off the section reveal animation, which would otherwise delay each click.
const renderInTripPage = (ui: ReactNode) => render(<div className="trip-page-shell">{ui}</div>);

const changes: ComponentProps<typeof ChangeSummary>['changes'] = [
  {
    change: 'modified',
    entity: 'activity',
    key: 'museum',
    label: 'Museum visit',
    fields: [
      {
        key: 'notes',
        label: 'Notes',
        display: 'value',
        format: 'text',
        before: 'Early visit',
        after: 'Afternoon visit',
        mediaBefore: [],
        mediaAfter: []
      },
      {
        key: 'attachments',
        label: 'Attachments',
        display: 'media',
        format: null,
        before: null,
        after: null,
        mediaBefore: [],
        mediaAfter: []
      }
    ]
  },
  {
    change: 'removed',
    entity: 'activity',
    key: 'lunch',
    label: 'Lunch booking',
    fields: [
      {
        key: 'title',
        label: 'Activity',
        display: 'value',
        format: 'text',
        before: 'Lunch booking',
        after: null,
        mediaBefore: [],
        mediaAfter: []
      }
    ]
  }
];
test('supports scanning, collapsing, and reopening changes without hiding removals', async () => {
  await renderInTripPage(<ChangeSummary changes={changes} status="draft" />);
  await expect.element(page.getByText('Attachments')).not.toBeInTheDocument();
  await expect.element(page.getByText('Afternoon visit')).toBeInTheDocument();
  await page.getByRole('button', { name: 'Collapse all' }).click();
  await expect
    .element(page.getByRole('button', { name: 'Expand Museum visit' }))
    .toHaveAttribute('aria-expanded', 'false');
  await page.getByRole('button', { name: 'Expand Museum visit' }).click();
  await expect
    .element(page.getByRole('button', { name: 'Collapse Museum visit' }))
    .toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('button', { name: 'Collapse all' }).click();
  await page.getByRole('button', { name: 'Expand all' }).click();
  await expect
    .element(page.getByRole('button', { name: 'Collapse Lunch booking' }))
    .toHaveAttribute('aria-expanded', 'true');
  expect(page.getByText('Lunch booking').elements().length).toBeGreaterThan(1);
});

afterEach(() => page.viewport(1280, 800));

const card = (label: string) => page.getByRole('article').filter({ hasText: label });

describe('a single change card', () => {
  test('collapses and expands on its own without touching its neighbours', async () => {
    await renderInTripPage(<ChangeSummary changes={changes} status="draft" />);
    await expect.element(card('Museum visit').getByText('Afternoon visit')).toBeVisible();

    await card('Museum visit').getByRole('button', { name: 'Collapse Museum visit' }).click();
    await expect.element(card('Museum visit').getByText('Afternoon visit')).not.toBeVisible();
    await expect
      .element(card('Museum visit').getByRole('button', { name: 'Expand Museum visit' }))
      .toHaveAttribute('aria-expanded', 'false');
    await expect.element(card('Lunch booking').getByText('Activity')).toBeVisible();
    await expect.element(page.getByRole('button', { name: 'Collapse all' })).toBeVisible();

    await card('Museum visit').getByRole('button', { name: 'Expand Museum visit' }).click();
    await expect.element(card('Museum visit').getByText('Afternoon visit')).toBeVisible();
  });

  test('keeps a collapsed card readable: its summary line stays while details hide', async () => {
    await renderInTripPage(<ChangeSummary changes={changes} status="draft" />);
    await card('Museum visit').getByRole('button', { name: 'Collapse Museum visit' }).click();
    expect(card('Museum visit').element().textContent).toContain('Updated activity · 1 detail');
  });
});

describe('commenting on a change', () => {
  function Commentable() {
    const [comments, setComments] = useState<ProposalFeedbackItem[]>([]);
    return (
      <ChangeSummary
        changes={changes}
        comments={comments}
        onComment={(changeKey, content) => {
          setComments((current) => [
            ...current,
            {
              author: { name: 'Alex' },
              changeKey,
              content,
              id: `comment-${current.length}`
            } as ProposalFeedbackItem
          ]);
          return Promise.resolve(true);
        }}
        status="draft"
      />
    );
  }

  test('opens a composer on that card, posts the comment and closes the composer', async () => {
    await renderInTripPage(<Commentable />);
    await card('Museum visit').getByRole('button', { name: 'Comment on Museum visit' }).click();
    await expect.element(card('Lunch booking').getByRole('textbox')).not.toBeInTheDocument();
    await card('Museum visit').getByRole('textbox').fill('Looks good, keeping this flexible.');
    await card('Museum visit').getByRole('button', { name: 'Add comment' }).click();

    await expect.element(card('Museum visit').getByRole('textbox')).not.toBeInTheDocument();
    expect(card('Museum visit').element().textContent).toContain(
      'Alex: Looks good, keeping this flexible.'
    );
    expect(card('Lunch booking').element().textContent).not.toContain('keeping this flexible');
  });

  test('a collapsed card still shows its comments', async () => {
    await renderInTripPage(<Commentable />);
    await card('Museum visit').getByRole('button', { name: 'Comment on Museum visit' }).click();
    await card('Museum visit').getByRole('textbox').fill('Early is better.');
    await card('Museum visit').getByRole('button', { name: 'Add comment' }).click();
    await card('Museum visit').getByRole('button', { name: 'Collapse Museum visit' }).click();
    await expect.element(card('Museum visit').getByText(/Early is better\./u)).toBeVisible();
  });
});

describe('on a phone', () => {
  test('stacks each detail under its own label and never scrolls sideways', async () => {
    await page.viewport(390, 844);
    await renderInTripPage(<ChangeSummary changes={changes} status="draft" />);
    const museum = card('Museum visit');
    await expect.element(museum.getByText('Afternoon visit')).toBeVisible();
    // The column headers belong to the wide table; the per-detail labels replace them here.
    await expect.element(museum.getByText('Shared plan').first()).not.toBeVisible();
    await expect.element(museum.getByText('Shared plan').last()).toBeVisible();
    await expect.element(museum.getByText('Your idea').last()).toBeVisible();
    await expect.element(museum.getByText('Detail')).not.toBeVisible();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      document.documentElement.clientWidth
    );
  });

  test('keeps the collapse control reachable and the layout intact after collapsing', async () => {
    await page.viewport(390, 844);
    await renderInTripPage(<ChangeSummary changes={changes} status="draft" />);
    await page.getByRole('button', { name: 'Collapse all' }).click();
    await expect.element(page.getByRole('button', { name: 'Expand all' })).toBeVisible();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      document.documentElement.clientWidth
    );
  });
});
