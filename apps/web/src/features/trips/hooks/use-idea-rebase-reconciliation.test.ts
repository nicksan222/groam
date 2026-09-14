import { act, renderHook } from '@testing-library/react';
import { expect, test } from 'vitest';
import {
  rebaseBlockedReason,
  rebaseExplanation,
  rebaseProgressLabel,
  type resolutionsFromChoices,
  useIdeaRebaseReconciliation
} from './use-idea-rebase-reconciliation';

const conflicts = [
  {
    currentFields: ['name'],
    currentSummary: 'Name: Shared Lisbon',
    entity: 'details' as const,
    key: 'trip.json',
    label: 'Trip details',
    proposedFields: ['name'],
    proposedSummary: 'Name: Idea Lisbon'
  },
  {
    currentFields: ['notes'],
    currentSummary: 'Notes: Keep the ferry',
    entity: 'destination' as const,
    key: 'destinations/lisbon.json',
    label: 'Lisbon',
    proposedFields: ['notes'],
    proposedSummary: 'Notes: Add a coast day'
  },
  {
    currentFields: ['title'],
    currentSummary: 'Title: Walking tour',
    entity: 'activity' as const,
    key: 'activities/walk.json',
    label: 'Walking tour',
    proposedFields: ['title'],
    proposedSummary: 'Title: Food tour'
  }
];

test('explains rebase as a working-copy update for the author or group admin', () => {
  expect(rebaseBlockedReason(true)).toBeNull();
  expect(rebaseBlockedReason(false)).toBe(
    'Only the idea author or a group organizer can update this idea.'
  );
});

test('formats progress and explanations for one conflict at a time', () => {
  expect(rebaseProgressLabel(0, 0)).toBe('');
  expect(rebaseProgressLabel(1, 5)).toBe('Change 2 of 5');
  expect(rebaseExplanation(conflicts[0]!)).toBe('The shared trip and this idea both changed name.');
  expect(
    rebaseExplanation({
      ...conflicts[0]!,
      currentFields: ['name'],
      proposedFields: ['duration']
    })
  ).toBe('The shared trip changed name. This idea changed duration.');
});

test('walks first, middle, and last steps and records keep-shared vs keep-idea', () => {
  const { result } = renderHook(() => useIdeaRebaseReconciliation());

  act(() => {
    result.current.start(conflicts);
  });
  expect(result.current.open).toBe(true);
  expect(result.current.progressLabel).toBe('Change 1 of 3');
  expect(result.current.current?.key).toBe('trip.json');
  expect(result.current.isFirst).toBe(true);
  expect(result.current.isLast).toBe(false);

  let choice = { completed: false, resolutions: [] as ReturnType<typeof resolutionsFromChoices> };
  act(() => {
    choice = result.current.choose('current');
  });
  expect(choice.completed).toBe(false);
  expect(result.current.progressLabel).toBe('Change 2 of 3');
  expect(result.current.current?.key).toBe('destinations/lisbon.json');
  expect(result.current.isFirst).toBe(false);
  expect(result.current.isLast).toBe(false);

  act(() => {
    result.current.choose('proposed');
  });
  expect(result.current.progressLabel).toBe('Change 3 of 3');
  expect(result.current.isLast).toBe(true);

  act(() => {
    result.current.back();
  });
  expect(result.current.progressLabel).toBe('Change 2 of 3');
  expect(result.current.currentChoice).toBe('proposed');

  act(() => {
    choice = result.current.choose('proposed');
  });
  expect(choice.completed).toBe(false);

  act(() => {
    choice = result.current.choose('current');
  });
  expect(choice).toEqual({
    completed: true,
    resolutions: [
      { choice: 'current', path: 'trip.json' },
      { choice: 'proposed', path: 'destinations/lisbon.json' },
      { choice: 'current', path: 'activities/walk.json' }
    ]
  });
});

test('does not open a wizard when there is nothing to reconcile', () => {
  const { result } = renderHook(() => useIdeaRebaseReconciliation());
  expect(result.current.open).toBe(false);
  expect(result.current.total).toBe(0);
  expect(result.current.current).toBeUndefined();
});
