import { expect, test } from 'vitest';
import { prettyJson } from './pretty-json';

test('indents compact JSON objects', () => {
  expect(prettyJson('{"tripId":"trip-1"}')).toBe('{\n  "tripId": "trip-1"\n}');
});

test('indents truncated JSON that cannot be parsed', () => {
  const pretty = prettyJson('{"itinerary":{"costTargets":[{"id":"a"…');
  expect(pretty).toContain('\n  "itinerary": {');
  expect(pretty).toContain('\n    "costTargets": [');
  expect(pretty.endsWith('…')).toBe(true);
});

test('leaves non-JSON text alone', () => {
  expect(prettyJson('not json')).toBe('not json');
});
