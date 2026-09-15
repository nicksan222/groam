import { v } from 'convex/values';
import { expectTypeOf, test } from 'vitest';
import { VersionDiff, VersionedModel } from './fields/index';

test('versioned models infer snapshot validators and presentation metadata together', () => {
  const model = VersionedModel.define({
    internalId: VersionDiff.hidden(v.string(), 'Internal ID'),
    receipt: VersionDiff.media(v.array(v.id('media')), 'Receipt'),
    title: VersionDiff.text(v.string(), 'Title')
  });

  expectTypeOf(model.fields).toHaveProperty('internalId');
  expectTypeOf(model.presentation).toHaveProperty('receipt');
  expectTypeOf(model.presentation.title.display).toEqualTypeOf<'value'>();
  expectTypeOf(model.presentation.title.format).toEqualTypeOf<'text'>();
});
