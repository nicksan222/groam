import { describe, expect, test } from 'vite-plus/test';
import {
  type IssueEvent,
  issueEventMessage,
  parseIssueEvent
} from '#convex/modules/travel/issues/events';

const actor = 'Alex Morgan';

describe('issue events', () => {
  test.each<IssueEvent>([
    { kind: 'status', status: 'open' },
    { kind: 'status', status: 'in_progress' },
    { kind: 'status', status: 'closed' },
    { kind: 'status', status: 'wont_do' },
    { idea: 'Coast day', kind: 'closed_by_idea' },
    { kind: 'assigned', name: 'Sam Planner' },
    { kind: 'unassigned', name: 'Sam Planner' },
    { kind: 'unassigned', name: null },
    { kind: 'condition_set', label: 'The trip has a destination' },
    { kind: 'condition_removed' },
    { change: 'resolved', kind: 'auto', label: 'The trip has a destination' },
    { change: 'reopened', kind: 'auto', label: 'The trip has a destination' }
  ])('reads back $kind', (event) => {
    expect(parseIssueEvent(actor, issueEventMessage(actor, event))).toEqual(event);
  });

  test('keeps the stored wording', () => {
    expect(issueEventMessage(actor, { kind: 'assigned', name: 'Sam' })).toBe(
      'Alex Morgan assigned this to Sam'
    );
    expect(issueEventMessage(actor, { change: 'reopened', kind: 'auto', label: 'Dates set' })).toBe(
      'Reopened automatically: Dates set no longer holds'
    );
  });

  test('leaves unknown wording or another actor unparsed', () => {
    expect(parseIssueEvent(actor, 'Alex Morgan renamed this')).toBeNull();
    expect(parseIssueEvent(actor, 'Sam Planner closed this')).toBeNull();
  });
});
