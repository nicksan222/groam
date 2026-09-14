import { describe, expect, test } from 'vitest';
import { ideaPrimaryAction, ideaStatusLabel, ideaStatusTone } from './idea-status';

const author = { userId: 'user-alex' };

describe('ideaStatusLabel', () => {
  test('uses the glossary for every status', () => {
    expect(ideaStatusLabel('draft')).toBe('Draft');
    expect(ideaStatusLabel('in_review')).toBe('In review');
    expect(ideaStatusLabel('conflicted')).toBe('Needs update');
    expect(ideaStatusLabel('merged')).toBe('Applied');
    expect(ideaStatusLabel('closed')).toBe('Closed');
  });
});

describe('ideaStatusTone', () => {
  test('marks conflicted as destructive and in-review as default', () => {
    expect(ideaStatusTone('conflicted')).toBe('destructive');
    expect(ideaStatusTone('in_review')).toBe('default');
    expect(ideaStatusTone('draft')).toBe('secondary');
  });
});

describe('ideaPrimaryAction', () => {
  test('sends a draft for review when the viewer is the author', () => {
    expect(ideaPrimaryAction({ author, status: 'draft' }, author)).toEqual({
      intent: 'submit',
      label: 'Send for review'
    });
    expect(ideaPrimaryAction({ author, status: 'draft' }, 'user-sam')).toBeNull();
  });

  test('prefers approve over apply while the viewer has not approved', () => {
    expect(
      ideaPrimaryAction(
        {
          author,
          canApprove: true,
          canMerge: true,
          hasApproved: false,
          status: 'in_review'
        },
        author
      )
    ).toEqual({ intent: 'approve', label: 'Approve' });
  });

  test('applies when the viewer can merge after approving', () => {
    expect(
      ideaPrimaryAction(
        {
          author,
          canApprove: true,
          canMerge: true,
          hasApproved: true,
          status: 'in_review'
        },
        author
      )
    ).toEqual({ intent: 'merge', label: 'Apply to shared trip' });
  });

  test('updates a conflicted idea from the shared trip', () => {
    expect(ideaPrimaryAction({ author, canRebase: true, status: 'conflicted' }, author)).toEqual({
      intent: 'rebase',
      label: 'Update from shared trip'
    });
  });

  test('returns nothing for applied or closed ideas', () => {
    expect(ideaPrimaryAction({ author, status: 'merged' }, author)).toBeNull();
    expect(ideaPrimaryAction({ author, status: 'closed' }, author)).toBeNull();
  });
});
