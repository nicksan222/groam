import { describe, expect, test } from 'vite-plus/test';
import { parseComposerClipboard } from './composer-clipboard';

describe('parseComposerClipboard', () => {
  test('reads text and token parts, keeping optional token fields', () => {
    const raw = JSON.stringify([
      { text: 'Ask ', type: 'text' },
      {
        data: 'x',
        id: 'g',
        kind: 'agent',
        label: 'groam',
        text: '@groam',
        trigger: '@',
        type: 'mention'
      },
      { id: 'poll', label: 'poll', trigger: '/', type: 'action' }
    ]);
    expect(parseComposerClipboard(raw)).toEqual([
      { text: 'Ask ', type: 'text' },
      {
        data: 'x',
        id: 'g',
        kind: 'agent',
        label: 'groam',
        text: '@groam',
        trigger: '@',
        type: 'mention'
      },
      { id: 'poll', label: 'poll', trigger: '/', type: 'action' }
    ]);
  });

  test('drops optional fields that are not strings', () => {
    const raw = JSON.stringify([
      { data: 1, id: 'g', kind: null, label: 'groam', text: false, trigger: '@', type: 'mention' }
    ]);
    expect(parseComposerClipboard(raw)).toEqual([
      { id: 'g', label: 'groam', trigger: '@', type: 'mention' }
    ]);
  });

  test.each([
    ['empty input', ''],
    ['invalid JSON', '{'],
    ['a non-array document', '{"type":"text"}'],
    ['a null part', '[null]'],
    ['an unknown part type', '[{"type":"image","id":"a","label":"b","trigger":"@"}]'],
    ['a token without an id', '[{"type":"mention","label":"b","trigger":"@"}]'],
    ['a text part without text', '[{"type":"text"}]'],
    ['an oversized document', `"${'a'.repeat(100_001)}"`],
    [
      'too many parts',
      JSON.stringify(Array.from({ length: 1_001 }, () => ({ text: 'a', type: 'text' })))
    ]
  ])('rejects %s', (_label, raw) => {
    expect(parseComposerClipboard(raw)).toBeNull();
  });
});
