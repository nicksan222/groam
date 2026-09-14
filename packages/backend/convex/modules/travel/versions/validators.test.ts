import { ConvexError } from 'convex/values';
import { expect, test } from 'vitest';
import { GitCommits } from './validators';

test('assertGitCommitOid accepts lowercase 40-character object ids', () => {
  expect(() => GitCommits.assertOid('a'.repeat(40), 'base tip')).not.toThrow();
});

test('assertGitCommitOid rejects malformed commit ids', () => {
  expect(() => GitCommits.assertOid('not-a-commit', 'idea tip')).toThrow(ConvexError);
  expect(() => GitCommits.assertOid('A'.repeat(40), 'applied tip')).toThrow(
    'Change history returned an invalid applied tip'
  );
});
