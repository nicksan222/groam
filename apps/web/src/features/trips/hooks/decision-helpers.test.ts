import { describe, expect, test } from 'vitest';
import {
  allowsSelfApproval,
  applyBlockReason,
  approveActionLabel,
  decisionHeadline
} from './decision-helpers';

describe('allowsSelfApproval', () => {
  test('is true when no human reviewers were asked', () => {
    expect(allowsSelfApproval({ reviewers: [] })).toBe(true);
    expect(
      allowsSelfApproval({
        reviewers: [{ agentId: 'reviewer', kind: 'agent', name: 'Idea reviewer' }]
      })
    ).toBe(true);
    expect(
      allowsSelfApproval({
        reviewers: [{ kind: 'user', name: 'Sam', userId: 'user-sam' }]
      })
    ).toBe(false);
  });
});

describe('applyBlockReason', () => {
  test('returns null when merge is allowed', () => {
    expect(
      applyBlockReason({
        canMerge: true,
        conversationsReady: true,
        remainingApprovals: 0,
        reviewReady: true,
        status: 'in_review',
        unresolvedFeedback: 0
      })
    ).toBeNull();
  });

  test('explains conflicted ideas', () => {
    expect(
      applyBlockReason({
        canMerge: false,
        conversationsReady: true,
        remainingApprovals: 0,
        reviewReady: true,
        status: 'conflicted',
        unresolvedFeedback: 0
      })
    ).toBe('Update this idea from the shared trip before applying.');
  });

  test('explains waiting approvals and conversations', () => {
    expect(
      applyBlockReason({
        canMerge: false,
        conversationsReady: false,
        remainingApprovals: 2,
        reviewReady: false,
        status: 'in_review',
        unresolvedFeedback: 1
      })
    ).toBe('Waiting on 2 approvals and 1 conversation.');
  });

  test('prompts self-approval when no human reviewers are required', () => {
    expect(
      applyBlockReason({
        canApprove: true,
        canMerge: false,
        conversationsReady: true,
        remainingApprovals: 1,
        reviewReady: false,
        selfApproval: true,
        status: 'in_review',
        unresolvedFeedback: 0
      })
    ).toBe('Approve this idea first.');
  });
});

describe('decisionHeadline', () => {
  test('describes drafts and ready ideas', () => {
    expect(
      decisionHeadline({
        checksPassed: false,
        remainingApprovals: 0,
        status: 'draft',
        unresolvedFeedback: 0
      }).title
    ).toBe('Review and send');

    expect(
      decisionHeadline({
        checksPassed: true,
        remainingApprovals: 0,
        status: 'in_review',
        unresolvedFeedback: 0
      }).title
    ).toBe('Ready to apply');
  });

  test('prompts self-approval when reviewers are not required', () => {
    expect(
      decisionHeadline({
        checksPassed: false,
        remainingApprovals: 1,
        selfApproval: true,
        status: 'in_review',
        unresolvedFeedback: 0
      })
    ).toMatchObject({
      description: 'No other reviewers are required. Approve this result, then apply it.',
      title: 'Approve to continue'
    });
  });

  test('keeps waiting on the group when human reviewers are required', () => {
    expect(
      decisionHeadline({
        checksPassed: false,
        remainingApprovals: 1,
        selfApproval: false,
        status: 'in_review',
        unresolvedFeedback: 0
      }).title
    ).toBe('Waiting on the group');
  });
});

describe('approveActionLabel', () => {
  test('uses Approve and Remove approval', () => {
    expect(approveActionLabel({ hasApproved: false, selfApproval: true })).toBe('Approve');
    expect(approveActionLabel({ hasApproved: true, selfApproval: true })).toBe('Remove approval');
    expect(approveActionLabel({ hasApproved: false, selfApproval: false })).toBe('Approve');
    expect(approveActionLabel({ hasApproved: true, selfApproval: false })).toBe('Remove approval');
  });
});
