import { v } from 'convex/values';
import { expect, test } from 'vite-plus/test';
import { defineClauseKind } from '#convex/modules/travel/issues/rules/define';

const sample = defineClauseKind({
  args: { count: v.number() },
  category: 'trip',
  check: (clause: { count: number }) =>
    clause.count > 0 ? { detail: null, met: true } : { detail: 'None', met: false },
  create: () => ({ count: 2 }),
  description: 'Sample',
  kind: 'sample',
  label: (clause: { count: number }) => `Has ${clause.count}`,
  needs: [],
  normalize: (clause: { count: number }) => ({ count: Math.trunc(clause.count) }),
  title: 'Sample'
});

const bare = defineClauseKind({
  args: {},
  category: 'trip',
  check: () => ({ detail: null, met: true }),
  description: 'Bare',
  kind: 'bare',
  label: () => 'Bare',
  needs: [],
  title: 'Bare'
});

test('create stamps the kind onto the defaults', () => {
  expect(sample.create()).toEqual({ count: 2, kind: 'sample' });
  expect(bare.create()).toEqual({ kind: 'bare' });
});

test('normalize applies the spec and keeps the kind, or passes through', () => {
  expect(sample.normalize({ count: 3.9, kind: 'sample' })).toEqual({ count: 3, kind: 'sample' });
  expect(bare.normalize({ kind: 'bare' })).toEqual({ kind: 'bare' });
});

test('fields default to empty and the validator includes the kind literal', () => {
  expect(bare.fields).toEqual([]);
  expect(Object.keys(sample.validator.fields).toSorted()).toEqual(['count', 'kind']);
});
