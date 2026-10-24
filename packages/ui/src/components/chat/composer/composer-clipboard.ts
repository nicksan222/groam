import type { ComposerPart, ComposerValue } from './composer-document';

export const COMPOSER_CLIPBOARD_TYPE = 'application/x-coss-composer';

const MAX_CLIPBOARD_LENGTH = 100_000;
const MAX_CLIPBOARD_PARTS = 1_000;

type ClipboardPart = Record<string, unknown>;

function optionalString<Key extends 'data' | 'kind' | 'text'>(
  part: ClipboardPart,
  key: Key
): Partial<Record<Key, string>> {
  const value = part[key];
  return typeof value === 'string' ? ({ [key]: value } as Partial<Record<Key, string>>) : {};
}

function parseTokenPart(part: ClipboardPart): ComposerPart | null {
  const { id, label, trigger, type } = part;
  if (type !== 'mention' && type !== 'action') return null;
  if (typeof id !== 'string' || typeof label !== 'string' || typeof trigger !== 'string') {
    return null;
  }
  return {
    type,
    id,
    label,
    trigger,
    ...optionalString(part, 'kind'),
    ...optionalString(part, 'data'),
    ...optionalString(part, 'text')
  };
}

function parsePart(part: unknown): ComposerPart | null {
  if (!part || typeof part !== 'object') return null;
  const record = part as ClipboardPart;
  if (record.type === 'text' && typeof record.text === 'string') {
    return { type: 'text', text: record.text };
  }
  return parseTokenPart(record);
}

/** Reads a structured composer clipboard payload; anything malformed falls back to plain text. */
export function parseComposerClipboard(raw: string): ComposerValue | null {
  if (!raw || raw.length > MAX_CLIPBOARD_LENGTH) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(value) || value.length > MAX_CLIPBOARD_PARTS) return null;
  const parts: ComposerPart[] = [];
  for (const item of value) {
    const part = parsePart(item);
    if (!part) return null;
    parts.push(part);
  }
  return parts;
}
