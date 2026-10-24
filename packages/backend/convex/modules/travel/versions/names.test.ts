import { describe, expect, test } from 'vite-plus/test';
import type { Doc, Id } from '#convex-generated/dataModel';
import { IdeaNames, MAX_AUTO_TITLE_LENGTH } from './names';

function proposal(
  value: Partial<Doc<'tripProposals'>> & Pick<Doc<'tripProposals'>, 'title'>
): Doc<'tripProposals'> {
  return {
    _creationTime: 0,
    _id: 'proposal' as Id<'tripProposals'>,
    author: { name: 'Test Owner', userId: 'user' },
    baseUpdatedAt: 0,
    feedbackCount: 0,
    organizationId: 'org',
    requiredApprovals: 1,
    reviewers: [],
    branchName: 'idea-one',
    shortId: 'idea01',
    sourceTripId: 'trip' as Id<'trips'>,
    status: 'draft',
    titleSource: 'user',
    unresolvedFeedbackCount: 0,
    updatedAt: 0,
    workingTripId: 'working' as Id<'trips'>,
    ...value
  };
}

describe('trip idea names', () => {
  test('creates a deterministic adjective-animal slug', () => {
    const first = IdeaNames.friendly('trip:user:123');
    const second = IdeaNames.friendly('trip:user:123');

    expect(first).toBe(second);
    expect(first).toMatch(/^[a-z]+-[a-z]+$/u);
  });

  test('distinguishes seeds that collide under unique-names-generator char-code hashing', () => {
    // unique-names-generator sums char codes, so equal-length timestamps with the
    // same digit sum (1008 vs 1017, or 90ms apart) produced identical idea names.
    expect(IdeaNames.friendly('trip:user:1008')).not.toBe(IdeaNames.friendly('trip:user:1017'));
    expect(IdeaNames.friendly('trip:user:1787076670099')).not.toBe(
      IdeaNames.friendly('trip:user:1787076670189')
    );
  });

  test('picks a different friendly slug when the first choice is already taken', () => {
    const seed = 'trip:user:123';
    const taken = IdeaNames.friendly(seed);

    expect(IdeaNames.uniqueFriendly(seed, [])).toBe(taken);
    const next = IdeaNames.uniqueFriendly(seed, [taken]);
    expect(next).toMatch(/^[a-z]+-[a-z]+$/u);
    expect(next).not.toBe(taken);
  });

  test('accepts a safe custom idea name and trims surrounding spaces', () => {
    expect(IdeaNames.custom('  itinerary/add-coast-day  ')).toBe('itinerary/add-coast-day');
  });

  test('converts spaces in custom idea names to dashes', () => {
    expect(IdeaNames.custom('two words')).toBe('two-words');
    expect(IdeaNames.custom('  coast   day trip  ')).toBe('coast-day-trip');
  });

  test.each(['', '../main', 'feature//days', 'feature.', 'feature.lock'])(
    'rejects unsafe custom idea name %j',
    (name) => {
      expect(() => IdeaNames.custom(name)).toThrow();
    }
  );

  test('allows auto titles only for default, issue, and auto sources', () => {
    expect(
      IdeaNames.allowsAutoTitle(
        proposal({ title: "Test Owner's trip idea", titleSource: 'default' })
      )
    ).toBe(true);
    expect(
      IdeaNames.allowsAutoTitle(
        proposal({
          issueId: 'issue' as Id<'tripIssues'>,
          title: 'Flights',
          titleSource: 'issue'
        })
      )
    ).toBe(true);
    expect(
      IdeaNames.allowsAutoTitle(proposal({ title: 'Add Lisbon day trip', titleSource: 'auto' }))
    ).toBe(true);
    expect(
      IdeaNames.allowsAutoTitle(proposal({ title: 'Add a coastal day trip', titleSource: 'user' }))
    ).toBe(false);
  });

  test('stops auto titles once an idea is merged or closed', () => {
    for (const status of ['merged', 'closed'] as const) {
      expect(
        IdeaNames.allowsAutoTitle(proposal({ status, title: 'Add Lisbon', titleSource: 'auto' }))
      ).toBe(false);
    }
    expect(
      IdeaNames.allowsAutoTitle(
        proposal({ status: 'in_review', title: 'Add Lisbon', titleSource: 'auto' })
      )
    ).toBe(true);
  });

  test('clamps generated titles at a word boundary', () => {
    expect(IdeaNames.clampAutoTitle('  "Add Kyoto stop."  ')).toBe('Add Kyoto stop');
    const clamped = IdeaNames.clampAutoTitle(
      'Add a long coastal detour through Sintra, Cascais, and the Arrábida hills'
    );
    expect(clamped).toBe('Add a long coastal detour through Sintra');
    expect(clamped.length).toBeLessThanOrEqual(MAX_AUTO_TITLE_LENGTH);
    expect(IdeaNames.clampAutoTitle('x'.repeat(60))).toHaveLength(MAX_AUTO_TITLE_LENGTH);
  });

  test('normalizes generated proposal titles', () => {
    expect(IdeaNames.normalizeTitle('  Extend Lisbon trip  ')).toBe('Extend Lisbon trip');
    expect(() => IdeaNames.normalizeTitle('')).toThrow();
    expect(() => IdeaNames.normalizeTitle('a'.repeat(101))).toThrow();
  });
});
