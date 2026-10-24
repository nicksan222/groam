import Timeline from '@groam/ui/components/timeline';
import { render } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { testIds } from '@/lib/test-ids';
import { IssueAutoStatusEvent } from './issue-auto-status-event';

const day = 86_400_000;

describe('IssueAutoStatusEvent', () => {
  test('names the rule that resolved the issue', async () => {
    await render(
      <Timeline variant="activity">
        <IssueAutoStatusEvent
          change="resolved"
          label="The trip has a destination"
          timestamp={Date.now() - day}
        />
      </Timeline>
    );
    const event = page.getByTestId(testIds.issueAutoStatusEvent);
    await expect.element(event).toHaveAttribute('data-change', 'resolved');
    await expect.element(event.getByText('Resolved automatically')).toBeVisible();
    await expect.element(event.getByText('The trip has a destination')).toBeVisible();
    await expect.element(event.getByText('yesterday')).toBeVisible();
    await expect
      .element(event.getByText('no longer holds', { exact: false }))
      .not.toBeInTheDocument();
  });

  test('names the rule that stopped holding on a reopen', async () => {
    await render(
      <Timeline variant="activity">
        <IssueAutoStatusEvent
          change="reopened"
          label="Planned costs fit the budget"
          timestamp={Date.now()}
        />
      </Timeline>
    );
    const event = page.getByTestId(testIds.issueAutoStatusEvent);
    await expect.element(event).toHaveAttribute('data-change', 'reopened');
    await expect.element(event.getByText('Reopened automatically')).toBeVisible();
    await expect.element(event.getByText('Planned costs fit the budget')).toBeVisible();
    await expect.element(event.getByText('no longer holds', { exact: false })).toBeVisible();
  });
});
