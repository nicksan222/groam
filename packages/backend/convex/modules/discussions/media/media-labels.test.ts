import { expect, test } from 'vite-plus/test';
import type { Id } from '#convex-generated/dataModel';
import { DiscussionMedia } from '#convex/modules/discussions/media/index';

const file = (contentType: string, name = 'file.bin') => ({ contentType, name });
const ids = (...values: string[]) => values as Id<'media'>[];

test('previews captionless uploads by their kind', () => {
  expect(DiscussionMedia.previewLabel([])).toBe('');
  expect(DiscussionMedia.previewLabel([file('image/png')])).toBe('Sent a photo');
  expect(DiscussionMedia.previewLabel([file('video/mp4')])).toBe('Sent a video');
  expect(DiscussionMedia.previewLabel([file('audio/mpeg')])).toBe('Sent file.bin');
  expect(DiscussionMedia.previewLabel([file('application/pdf', 'plan.pdf')])).toBe('Sent plan.pdf');
  expect(DiscussionMedia.previewLabel([file('image/png'), file('video/mp4')])).toBe('Sent 2 files');
});

test('compares attachment id lists by order and treats missing as empty', () => {
  expect(DiscussionMedia.sameIds(undefined, [])).toBe(true);
  expect(DiscussionMedia.sameIds(ids('a', 'b'), ids('a', 'b'))).toBe(true);
  expect(DiscussionMedia.sameIds(ids('a', 'b'), ids('b', 'a'))).toBe(false);
  expect(DiscussionMedia.sameIds(ids('a'), ids('a', 'b'))).toBe(false);
  expect(DiscussionMedia.normalizeIds(undefined)).toEqual([]);
  expect(DiscussionMedia.normalizeIds([])).toEqual([]);
});
