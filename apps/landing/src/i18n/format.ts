export type Messages = Readonly<Record<string, string>>;
export type Values = Record<string, string | number>;

export const normalizeMessage = (text: string) => text.replace(/\s+/gu, ' ').trim();
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
const patterns = new WeakMap<Messages, { expression: RegExp; names: string[]; value: string }[]>();

function interpolate(text: string, values: Values, messages: Messages) {
  return text.replace(/\{(\w+)\}/gu, (original, key: string) => {
    const value = values[key];
    if (value === undefined) return original;
    return messages[normalizeMessage(String(value))] ?? String(value);
  });
}

/** Exact source messages and explicit placeholders; never replace substrings inside prose. */
export function formatMessage(text: string, messages: Messages, values: Values = {}): string {
  const key = normalizeMessage(text);
  const direct = messages[key];
  if (direct !== undefined) return interpolate(direct, values, messages);
  let compiled = patterns.get(messages);
  if (!compiled) {
    compiled = Object.entries(messages).flatMap(([source, value]) => {
      const names: string[] = [];
      let position = 0;
      let pattern = '';
      for (const match of source.matchAll(/\{(\w+)\}/gu)) {
        pattern += escapeRegExp(source.slice(position, match.index)) + '(.+?)';
        names.push(match[1] ?? '');
        position = match.index + match[0].length;
      }
      if (!names.length) return [];
      pattern += escapeRegExp(source.slice(position));
      return [{ expression: new RegExp(`^${pattern}$`, 'u'), names, value }];
    });
    patterns.set(messages, compiled);
  }
  for (const { expression, names, value } of compiled) {
    const match = expression.exec(key);
    if (match)
      return interpolate(
        value,
        Object.fromEntries(names.map((name, index) => [name, match[index + 1] ?? ''])),
        messages
      );
  }
  return interpolate(text, values, messages);
}

export const textAttributes = new Set([
  'aria-label',
  'aria-description',
  'aria-valuetext',
  'title',
  'alt',
  'placeholder',
  'data-question',
  'data-answer',
  'data-context',
  'data-job',
  'data-idea-status',
  'data-idea-note',
  'data-empty',
  'data-before',
  'data-start',
  'data-status',
  'data-copy-label'
]);

export const isMessage = (text: string) => {
  const value = normalizeMessage(text);
  return value.length > 1 && /[a-zA-Z]/u.test(value) && !/^https?:/u.test(value);
};
