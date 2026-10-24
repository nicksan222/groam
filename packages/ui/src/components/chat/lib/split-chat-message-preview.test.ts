import { describe, expect, test } from 'vite-plus/test';
import { splitChatMessagePreview } from './split-chat-message-preview';

describe('splitChatMessagePreview', () => {
  test('keeps short text whole', () => {
    expect(splitChatMessagePreview('Short note', 20)).toEqual({
      preview: 'Short note',
      remainder: null
    });
  });

  test('prefers a paragraph break past half the limit', () => {
    const text = `${'a'.repeat(12)}\n\n${'b'.repeat(20)}`;
    expect(splitChatMessagePreview(text, 16)).toEqual({
      preview: 'a'.repeat(12),
      remainder: 'b'.repeat(20)
    });
  });

  test('falls back to the last whitespace before the limit', () => {
    expect(splitChatMessagePreview('one two three four five', 10)).toEqual({
      preview: 'one two',
      remainder: 'three four five'
    });
  });

  test('cuts at the limit when there is no whitespace', () => {
    expect(splitChatMessagePreview('abcdefghij', 4)).toEqual({
      preview: 'abcd',
      remainder: 'efghij'
    });
  });

  test('never splits a grapheme cluster', () => {
    const family = '👨‍👩‍👧';
    const result = splitChatMessagePreview(`ab${family}cd`, 4);
    expect(result.preview).toBe('ab');
    expect(result.remainder).toBe(`${family}cd`);
  });

  test('keeps at least one grapheme in the preview', () => {
    const result = splitChatMessagePreview('😀😀😀', 1);
    expect(result.preview).toBe('😀');
    expect(result.remainder).toBe('😀😀');
  });
});
