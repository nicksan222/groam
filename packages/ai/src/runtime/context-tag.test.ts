import { describe, expect, test } from 'vitest';
import { parseAssistantContextTag, parseAssistantContextTags } from './context-tag';

const tag = { id: 'trip-1', kind: 'trip', label: 'Portugal', tripId: 'trip-1' };

describe('parseAssistantContextTags', () => {
  test('parses a valid tag list', () => {
    expect(parseAssistantContextTags([tag])).toEqual([tag]);
    expect(parseAssistantContextTags([])).toEqual([]);
  });

  test('rejects non-arrays and lists with an invalid entry', () => {
    expect(parseAssistantContextTags(undefined)).toBeNull();
    expect(parseAssistantContextTags({})).toBeNull();
    expect(parseAssistantContextTags([tag, { ...tag, kind: 'unknown' }])).toBeNull();
  });

  test('single-tag parsing still validates each field', () => {
    expect(parseAssistantContextTag(tag)).toEqual(tag);
    expect(parseAssistantContextTag({ ...tag, tripId: 42 })).toBeNull();
  });
});
