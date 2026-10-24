import { afterEach, describe, expect, test } from 'vite-plus/test';
import {
  type ComposerValue,
  currentQuery,
  equalValue,
  getComposerText,
  insertItem,
  readSelection,
  readValue,
  restoreSelection,
  writeValue
} from './composer-document';

const mention = { id: 'g', label: 'groam', trigger: '@', type: 'mention' } as const;

function editable(html = ''): HTMLDivElement {
  const root = document.createElement('div');
  root.contentEditable = 'true';
  root.innerHTML = html;
  document.body.append(root);
  return root;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('readValue', () => {
  test.each([
    ['plain text', 'Hello', [{ text: 'Hello', type: 'text' }]],
    ['a line break', 'a<br>b', [{ text: 'a\nb', type: 'text' }]],
    ['a trailing placeholder break', 'a<br>', [{ text: 'a', type: 'text' }]],
    [
      'a marked placeholder break',
      'a<br data-composer-placeholder="">b',
      [{ text: 'ab', type: 'text' }]
    ],
    ['block lines', '<div>a</div><div>b</div>', [{ text: 'a\nb', type: 'text' }]],
    ['text before a block', 'a<div>b</div>', [{ text: 'a\nb', type: 'text' }]],
    ['a block after a break', 'a<br><div>b</div>', [{ text: 'a\nb', type: 'text' }]],
    ['a block before text', '<p>a</p>b', [{ text: 'a\nb', type: 'text' }]],
    ['inline markup', 'a<b>b</b>c', [{ text: 'abc', type: 'text' }]],
    ['nested blocks', '<div><div>a</div><div>b</div></div>', [{ text: 'a\nb', type: 'text' }]]
  ])('reads %s', (_label, html, expected) => {
    expect(readValue(editable(html))).toEqual(expected);
  });

  test('keeps a trailing break when asked not to ignore it', () => {
    expect(readValue(editable('a<br>'), false)).toEqual([{ text: 'a\n', type: 'text' }]);
  });

  test('reads tokens with their optional fields', () => {
    const root = editable(
      'Hi <span data-composer-token="mention" data-id="g" data-label="groam" data-trigger="@" data-kind="agent" data-data="d" data-text="@G">x</span> there'
    );
    expect(readValue(root)).toEqual([
      { text: 'Hi ', type: 'text' },
      {
        data: 'd',
        id: 'g',
        kind: 'agent',
        label: 'groam',
        text: '@G',
        trigger: '@',
        type: 'mention'
      },
      { text: ' there', type: 'text' }
    ]);
  });

  test('defaults missing token fields', () => {
    const root = editable('<span data-composer-token="action"></span>');
    expect(readValue(root)).toEqual([{ id: '', label: '', trigger: '@', type: 'action' }]);
  });

  test('reads a textarea as plain text', () => {
    const textarea = document.createElement('textarea');
    expect(readValue(textarea)).toEqual([]);
    textarea.value = 'Plain';
    expect(readValue(textarea)).toEqual([{ text: 'Plain', type: 'text' }]);
  });
});

describe('writeValue', () => {
  test('round-trips text, tokens, and a trailing newline', () => {
    const value: ComposerValue = [
      { text: 'Ask ', type: 'text' },
      mention,
      { text: ' now\n', type: 'text' }
    ];
    const root = editable();
    writeValue(root, value);
    expect(readValue(root)).toEqual(value);
    expect(root.querySelector('[data-composer-placeholder]')).not.toBeNull();
    expect(root.querySelector('[data-composer-token]')?.getAttribute('contenteditable')).toBe(
      'false'
    );
  });

  test('writes plain text to a textarea', () => {
    const textarea = document.createElement('textarea');
    writeValue(textarea, [{ text: 'Hi ', type: 'text' }, mention]);
    expect(textarea.value).toBe('Hi @groam');
  });
});

describe('value helpers', () => {
  test('compares drafts after merging adjacent text', () => {
    expect(
      equalValue(
        [
          { text: 'a', type: 'text' },
          { text: 'b', type: 'text' }
        ],
        [{ text: 'ab', type: 'text' }]
      )
    ).toBe(true);
    expect(equalValue([mention], [{ ...mention, kind: 'agent' }])).toBe(false);
    expect(equalValue([mention], [{ text: '@groam', type: 'text' }])).toBe(false);
  });

  test('uses explicit token text or the trigger and label', () => {
    expect(getComposerText([mention, { ...mention, text: 'G' }])).toBe('@groamG');
  });
});

describe('selection', () => {
  test('reads and restores canonical caret offsets around tokens', () => {
    const root = editable();
    writeValue(root, [{ text: 'Hi ', type: 'text' }, mention, { text: ' there', type: 'text' }]);
    root.focus();
    const last = root.lastChild as Text;
    window.getSelection()?.collapse(last, 3);
    const selection = readSelection(root);
    expect(selection).toEqual({ anchor: 12, focus: 12 });

    window.getSelection()?.collapse(root, 0);
    restoreSelection(root, selection);
    expect(window.getSelection()?.anchorNode).toBe(last);
    expect(window.getSelection()?.anchorOffset).toBe(3);

    restoreSelection(root, { anchor: 9, focus: 9 });
    expect(window.getSelection()?.anchorNode).toBe(root);
    expect(window.getSelection()?.anchorOffset).toBe(2);

    restoreSelection(root, { anchor: 99, focus: 99 });
    expect(window.getSelection()?.anchorOffset).toBe(root.childNodes.length);
  });

  test('returns no selection when the caret is outside the input', () => {
    const root = editable('Hi');
    const outside = editable('Elsewhere');
    window.getSelection()?.collapse(outside.firstChild, 1);
    expect(readSelection(root)).toBeNull();
  });

  test('reads and restores a backward textarea selection', () => {
    const textarea = document.createElement('textarea');
    document.body.append(textarea);
    textarea.value = 'Hello';
    textarea.focus();
    restoreSelection(textarea, { anchor: 4, focus: 1 });
    expect(readSelection(textarea)).toEqual({ anchor: 4, focus: 1 });
  });
});

describe('queries and suggestions', () => {
  test('finds the active trigger query and inserts the chosen item as a token', () => {
    const root = editable('Ask @gr');
    root.focus();
    window.getSelection()?.collapse(root.firstChild, 7);
    const query = currentQuery(root, [{ character: '@', items: [] }]);
    expect(query).toMatchObject({ character: '@', end: 7, start: 4, text: 'gr' });
    if (!query) throw new Error('Expected a query');

    insertItem(root, query, { id: 'g', kind: 'agent', label: 'groam' });
    expect(readValue(root)).toEqual([
      { text: 'Ask ', type: 'text' },
      { id: 'g', kind: 'agent', label: 'groam', trigger: '@', type: 'mention' },
      { text: ' ', type: 'text' }
    ]);
    expect(readSelection(root)).toEqual({ anchor: 11, focus: 11 });
  });

  test('reuses an existing space after the query', () => {
    const root = editable('@gr now');
    root.focus();
    window.getSelection()?.collapse(root.firstChild, 3);
    const query = currentQuery(root, [{ character: '@', items: [] }]);
    if (!query) throw new Error('Expected a query');
    insertItem(root, query, { id: 'g', label: 'groam' });
    expect(getComposerText(readValue(root))).toBe('@groam now');
    expect(readSelection(root)).toEqual({ anchor: 7, focus: 7 });
  });

  test('merges split text nodes and respects the maximum query length', () => {
    const root = editable();
    root.append(document.createTextNode('/po'), document.createTextNode('ll'));
    root.focus();
    window.getSelection()?.collapse(root.lastChild, 2);
    expect(currentQuery(root, [{ character: '/', items: [], maxQueryLength: 3 }])).toBeNull();
    expect(root.childNodes).toHaveLength(1);
    expect(currentQuery(root, [{ character: '/', items: [] }])).toMatchObject({ text: 'poll' });
  });
});
