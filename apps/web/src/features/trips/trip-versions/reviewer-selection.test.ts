import { describe, expect, test } from 'vitest';
import {
  filterReviewerOptions,
  type Reviewer,
  reviewerIsSelected,
  reviewerKey,
  toggleReviewerSelection
} from '@/features/trips/trip-versions/reviewer-selection';

const groam: Reviewer = { agentId: 'reviewer', kind: 'agent', name: 'Idea reviewer' };
const maya: Reviewer = { kind: 'user', name: 'Maya Morgan', userId: 'maya' };
const sofia: Reviewer = { kind: 'user', name: 'Sofia Morgan', userId: 'sofia' };

describe('reviewer selection', () => {
  test('filters reviewer options by name', () => {
    expect(filterReviewerOptions([groam, maya, sofia], '  MAYA ')).toEqual([maya]);
  });

  test('adds and removes a requested human reviewer', () => {
    const selected = toggleReviewerSelection([groam], maya);
    expect(reviewerIsSelected(selected, maya)).toBe(true);
    expect(toggleReviewerSelection(selected, maya)).toEqual([groam]);
  });

  test('builds stable keys for agent and user reviewers', () => {
    expect(reviewerKey(groam)).toBe('reviewer');
    expect(reviewerKey(maya)).toBe('maya');
  });
});
