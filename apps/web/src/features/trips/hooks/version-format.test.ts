import { describe, expect, test } from 'vitest';
import { ideaStatusLabel } from '@/features/ideas/idea-status';
import {
  formatBytes,
  formatCommentTime,
  formatDiffValue,
  isEmptyDiffField
} from './version-format';

describe('version-format', () => {
  test('detects empty media and text fields', () => {
    expect(
      isEmptyDiffField(
        {
          after: '',
          before: '',
          display: 'value',
          format: 'text',
          key: 'name',
          label: 'Name',
          mediaAfter: [],
          mediaBefore: []
        },
        'after'
      )
    ).toBe(true);
    expect(
      isEmptyDiffField(
        {
          after: null,
          before: null,
          display: 'media',
          format: null,
          key: 'cover',
          label: 'Cover',
          mediaAfter: [],
          mediaBefore: [
            {
              contentType: 'image/jpeg',
              id: 'm1',
              name: 'cover.jpg',
              size: 1024,
              url: 'https://example.com'
            }
          ]
        },
        'before'
      )
    ).toBe(false);
  });

  test('formats money, duration, and bytes', () => {
    expect(formatDiffValue('schedule', { day: 1, timeBlock: 'afternoon' })).toBe(
      'Day 1 · Afternoon'
    );
    expect(formatDiffValue('money', { amount: 1200 })).toBe((1200).toLocaleString());
    expect(formatDiffValue('duration', { minutes: 90 })).toBe('90 min');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
  });

  test('formats relative comment times', () => {
    const now = Date.parse('2026-01-15T12:00:00.000Z');
    expect(formatCommentTime(now, now)).toBe('just now');
    expect(ideaStatusLabel('in_review')).toBe('In review');
    expect(ideaStatusLabel('conflicted')).toBe('Needs update');
    expect(ideaStatusLabel('draft')).toBe('Draft');
  });
});
