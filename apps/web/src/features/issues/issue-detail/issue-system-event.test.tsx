import { render } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { IssueSystemEvent } from './issue-system-event';

const day = 86_400_000;

describe('IssueSystemEvent', () => {
  test('lists every grouped event with its relative time', async () => {
    await render(
      <IssueSystemEvent
        events={[
          { id: 'e1', message: 'Sam assigned Alex', timestamp: Date.now() - 2 * day },
          { id: 'e2', message: 'Alex marked this In progress', timestamp: Date.now() - day }
        ]}
      />
    );
    await expect.element(page.getByRole('listitem')).toHaveLength(2);
    await expect.element(page.getByText('Sam assigned Alex')).toBeVisible();
    await expect.element(page.getByText('2 days ago')).toBeVisible();
    await expect.element(page.getByText('Alex marked this In progress')).toBeVisible();
    await expect.element(page.getByText('yesterday')).toBeVisible();
  });

  test('renders an empty list without events', async () => {
    await render(<IssueSystemEvent events={[]} />);
    await expect.element(page.getByRole('listitem')).not.toBeInTheDocument();
  });
});
