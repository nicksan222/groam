import { isRecord } from '#ai/runtime/context-tag';

export const SUBMITTED_FORM_RESPONSE_PREFIX = 'Here are my form responses:\n';

export function parseSubmittedFormResponse(text: string): Array<[string, string]> | null {
  const prefix = SUBMITTED_FORM_RESPONSE_PREFIX;
  if (!text.startsWith(prefix)) return null;
  try {
    const values: unknown = JSON.parse(text.slice(prefix.length));
    if (!isRecord(values)) return null;
    return Object.entries(values)
      .slice(0, 12)
      .map(([key, value]) => [
        key
          .replace(/([a-z])([A-Z])/gu, '$1 $2')
          .replace(/[_-]+/gu, ' ')
          .replace(/^./u, (letter: string) => letter.toLocaleUpperCase()),
        Array.isArray(value)
          ? value.map(String).join(', ')
          : typeof value === 'boolean'
            ? value
              ? 'Yes'
              : 'No'
            : String(value ?? '—')
      ]);
  } catch {
    return null;
  }
}
