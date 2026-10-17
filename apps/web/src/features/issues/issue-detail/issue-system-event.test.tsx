import Timeline from '@groam/ui/components/timeline';
import { render } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { IssueSystemEvent } from './issue-system-event';

const day = 86_400_000;
const actorName = 'Sam Planner';

describe('IssueSystemEvent', () => {
  test('lists every grouped event as actor, action, and chip with its relative time', async () => {
    await render(
      <Timeline variant="activity">
        <IssueSystemEvent
          events={[
            {
              actorName,
              event: { kind: 'assigned', name: 'Alex Morgan' },
              id: 'e1',
              message: 'Sam Planner assigned this to Alex Morgan',
              timestamp: Date.now() - 2 * day
            },
            {
              actorName,
              event: { kind: 'status', status: 'in_progress' },
              id: 'e2',
              message: 'Sam Planner started working on this',
              timestamp: Date.now() - day
            }
          ]}
        />
      </Timeline>
    );
    const items = page.getByRole('listitem');
    await expect.element(items).toHaveLength(2);
    await expect
      .poll(() => items.nth(0).element().textContent?.replaceAll(/\s+/gu, ' '))
      .toContain('Sam Planner assigned Alex Morgan 2 days ago');
    await expect
      .poll(() => items.nth(1).element().textContent?.replaceAll(/\s+/gu, ' '))
      .toContain('Sam Planner moved this to In progress yesterday');
  });

  test.each([
    [{ idea: 'Coast day', kind: 'closed_by_idea' as const }, 'closed this by applying Coast day'],
    [{ kind: 'unassigned' as const, name: null }, 'unassigned this'],
    [{ kind: 'condition_set' as const, label: 'Dates are set' }, 'set Done when to Dates are set'],
    [{ kind: 'condition_removed' as const }, 'removed the Done when rule']
  ])('reads %o as a sentence', async (event, text) => {
    await render(
      <Timeline variant="activity">
        <IssueSystemEvent
          events={[{ actorName, event, id: 'e1', message: '', timestamp: Date.now() }]}
        />
      </Timeline>
    );
    await expect.element(page.getByRole('listitem')).toHaveTextContent(`Sam Planner ${text} today`);
  });

  test('keeps wording it does not know as written', async () => {
    await render(
      <Timeline variant="activity">
        <IssueSystemEvent
          events={[
            { actorName, event: null, id: 'e1', message: 'Something old', timestamp: Date.now() }
          ]}
        />
      </Timeline>
    );
    await expect.element(page.getByText('Something old')).toBeVisible();
  });

  test('renders an empty list without events', async () => {
    await render(
      <Timeline variant="activity">
        <IssueSystemEvent events={[]} />
      </Timeline>
    );
    await expect.element(page.getByRole('listitem')).not.toBeInTheDocument();
  });
});
