import type { Id } from '@groam/backend/data-model';
import { describe, expect, test } from 'vite-plus/test';
import { boardIdea, boardIssue } from '@/features/trips/testing/trip-board-fixtures';
import {
  linkToneClass,
  tripBoardLinkTones,
  tripBoardLinks,
  withLinkedIdea
} from './trip-board-links';

const answering = (id: string, issueId: string, over = {}) =>
  boardIdea(id, { issueId: issueId as Id<'tripIssues'>, ...over });

const summary = (links: ReturnType<typeof tripBoardLinks>) =>
  [...links].map(([issueId, link]) => [issueId, link.idea.title, link.issueTitle, link.tone]);

describe('tripBoardLinks', () => {
  test('pairs each issue with its open idea and skips ideas started on their own', () => {
    const links = tripBoardLinks(
      [answering('a', 'issue-1'), boardIdea('loose'), answering('b', 'issue-2')],
      [boardIssue('issue-1'), boardIssue('issue-2')]
    );
    expect(summary(links)).toEqual([
      ['issue-1', 'a', 'issue-1', expect.any(Number)],
      ['issue-2', 'b', 'issue-2', expect.any(Number)]
    ]);
  });

  test('keeps the hues when the lane reorders, since they follow the issue ids', () => {
    const issues = [boardIssue('issue-1'), boardIssue('issue-2')];
    const before = tripBoardLinks([answering('a', 'issue-1'), answering('b', 'issue-2')], issues);
    const after = tripBoardLinks([answering('b', 'issue-2'), answering('a', 'issue-1')], issues);
    expect(after.get('issue-1' as Id<'tripIssues'>)?.tone).toBe(
      before.get('issue-1' as Id<'tripIssues'>)?.tone
    );
    expect(after.get('issue-2' as Id<'tripIssues'>)?.tone).toBe(
      before.get('issue-2' as Id<'tripIssues'>)?.tone
    );
  });

  test("keeps every pair's hue when another pair opens or closes", () => {
    const tones = (ids: string[]) =>
      tripBoardLinks(
        ids.map((id) => answering(`idea-${id}`, id)),
        []
      );
    const two = tones(['issue-2', 'issue-3']);
    const three = tones(['issue-1', 'issue-2', 'issue-3']);
    for (const id of ['issue-2', 'issue-3'] as Id<'tripIssues'>[]) {
      expect(three.get(id)?.tone).toBe(two.get(id)?.tone);
    }
  });

  test('picks every hue in range', () => {
    const links = tripBoardLinks(
      Array.from({ length: 40 }, (_, n) => answering(`idea-${n}`, `issue-${n}`)),
      []
    );
    for (const { tone } of links.values()) {
      expect(tone).toBeGreaterThanOrEqual(0);
      expect(tone).toBeLessThan(tripBoardLinkTones.length);
    }
  });

  test('names the first idea in the lane when two answer one issue', () => {
    const links = tripBoardLinks([answering('a', 'issue-1'), answering('b', 'issue-1')], []);
    expect(summary(links)).toEqual([['issue-1', 'a', undefined, expect.any(Number)]]);
  });

  test('carries what the issue card needs to name the idea', () => {
    const links = tripBoardLinks([answering('a', 'issue-1', { status: 'draft' })], []);
    expect(links.get('issue-1' as Id<'tripIssues'>)?.idea).toEqual({
      id: 'a',
      status: 'draft',
      title: 'a',
      workingTripId: 'trip-work'
    });
  });

  test.each([undefined, []])('pairs nothing while ideas are %s', (ideas) => {
    expect(tripBoardLinks(ideas, undefined).size).toBe(0);
  });
});

describe('withLinkedIdea', () => {
  const closed = { id: 'idea-new', status: 'closed', title: 'Camping', workingTripId: 'trip-work' };

  test('names the paired open idea when the newest idea differs', () => {
    const link = tripBoardLinks([answering('a', 'issue-1')], []).get('issue-1' as Id<'tripIssues'>);
    const issue = boardIssue('issue-1', { idea: closed } as never);
    expect(withLinkedIdea(issue, link).idea?.title).toBe('a');
  });

  test.each([
    ['without a link', undefined],
    ['when the newest idea is the paired one', 'same']
  ])('returns the issue untouched %s', (_, mode) => {
    const issue = boardIssue('issue-1', { idea: closed } as never);
    const link = mode
      ? tripBoardLinks([boardIdea('idea-new', { issueId: 'issue-1' as Id<'tripIssues'> })], []).get(
          'issue-1' as Id<'tripIssues'>
        )
      : undefined;
    expect(withLinkedIdea(issue, link)).toBe(issue);
  });
});

describe('linkToneClass', () => {
  test('cycles the hues past the palette', () => {
    expect(linkToneClass(tripBoardLinkTones.length)).toBe(linkToneClass(0));
  });

  test('never uses chart-3, the dark theme warning yellow', () => {
    expect(tripBoardLinkTones.join(' ')).not.toContain('chart-3');
  });

  test('keeps the chip text foreground for contrast', () => {
    expect(linkToneClass(1)).toContain('text-foreground');
  });
});
