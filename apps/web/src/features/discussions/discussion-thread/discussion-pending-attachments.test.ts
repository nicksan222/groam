import { afterEach, expect, test, vi } from 'vitest';
import { MAX_MEDIA_PER_MESSAGE } from './discussion-message-body';
import {
  appendPendingAttachments,
  isPreviewableMedia,
  revokePendingAttachmentUrls
} from './discussion-pending-attachments';

afterEach(() => {
  vi.unstubAllGlobals();
});

test('treats images, video, and audio as previewable', () => {
  expect(isPreviewableMedia('image/png')).toBe(true);
  expect(isPreviewableMedia('video/mp4')).toBe(true);
  expect(isPreviewableMedia('audio/webm')).toBe(true);
  expect(isPreviewableMedia('application/pdf')).toBe(false);
});

test('appends valid files and reports validation errors', () => {
  const createPreviewUrl = vi.fn(() => 'blob:preview');
  const photo = new File(['img'], 'sunset.png', { type: 'image/png' });
  const notes = new File(['pdf'], 'notes.txt', { type: 'text/plain' });

  const result = appendPendingAttachments([], [photo, notes], createPreviewUrl);

  expect(result.next).toHaveLength(1);
  expect(result.next[0]?.file).toBe(photo);
  expect(result.next[0]?.previewUrl).toBe('blob:preview');
  expect(result.errors).toEqual(['Upload an image, video, audio file, or PDF']);
  expect(createPreviewUrl).toHaveBeenCalledWith(photo);
});

test('stops adding files once the per-message limit is reached', () => {
  const current = Array.from({ length: MAX_MEDIA_PER_MESSAGE }, (_, index) => ({
    file: new File(['x'], `${index}.png`, { type: 'image/png' }),
    id: `id-${index}`,
    previewUrl: null
  }));
  const extra = new File(['y'], 'extra.png', { type: 'image/png' });

  const result = appendPendingAttachments(current, [extra], () => 'blob:preview');

  expect(result.next).toHaveLength(MAX_MEDIA_PER_MESSAGE);
  expect(result.errors).toEqual([`You can attach up to ${MAX_MEDIA_PER_MESSAGE} files`]);
});

test('revokes object URLs for pending attachments', () => {
  const revoke = vi.fn();
  vi.stubGlobal('URL', { ...URL, revokeObjectURL: revoke });

  revokePendingAttachmentUrls([
    { file: new File(['a'], 'a.png', { type: 'image/png' }), id: 'a', previewUrl: 'blob:a' },
    { file: new File(['b'], 'b.pdf', { type: 'application/pdf' }), id: 'b', previewUrl: null }
  ]);

  expect(revoke).toHaveBeenCalledWith('blob:a');
  expect(revoke).toHaveBeenCalledTimes(1);
});
