/**
 * Query values as typed values: `true`/`false` and plain numbers become booleans and numbers,
 * everything else stays a string. Route search parsers validate the result.
 */
export function parseSearch(query: URLSearchParams): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const [key, value] of query) {
    if (value === 'true' || value === 'false') values[key] = value === 'true';
    else if (/^-?\d+(?:\.\d+)?$/u.test(value)) values[key] = Number(value);
    else values[key] = value;
  }
  return values;
}
