export function parseSubmittedFormResponse(text: string): Array<[string, string]> | null {
  const prefix = 'Here are my form responses:\n';
  if (!text.startsWith(prefix)) return null;
  try {
    const values: unknown = JSON.parse(text.slice(prefix.length));
    if (typeof values !== 'object' || values === null || Array.isArray(values)) return null;
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
