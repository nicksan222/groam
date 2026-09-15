import { expect, test } from 'vitest';
import {
  catalogToolLabel,
  conventionalToolLabel,
  toolEventFromResult,
  truncateJson
} from './tool-event';

test('uses conventional labels for known and unknown tools', () => {
  expect(catalogToolLabel('getItinerary')).toEqual(conventionalToolLabel('getItinerary'));
  expect(catalogToolLabel('unknownTool')).toEqual(conventionalToolLabel('unknownTool'));
});

test('humanizes camelCase tool names', () => {
  expect(conventionalToolLabel('getItinerary')).toEqual({
    complete: 'Read itinerary',
    running: 'Reading itinerary'
  });
  expect(conventionalToolLabel('webSearch')).toEqual({
    complete: 'Used web search',
    running: 'Using web search'
  });
});

test('records a successful tool result without an activity receipt', () => {
  expect(
    toolEventFromResult({
      input: { tripId: 'trip-1' },
      output: { itinerary: { tripName: 'Lisbon' } },
      toolName: 'getItinerary'
    })
  ).toEqual({
    input: '{"tripId":"trip-1"}',
    label: 'Read itinerary',
    ok: true,
    output: '{"itinerary":{"tripName":"Lisbon"}}',
    toolName: 'getItinerary'
  });
});

test('marks SDK errors as failed even when the output has no activity field', () => {
  expect(
    toolEventFromResult({
      args: { query: 'flights' },
      isError: true,
      output: 'search timed out',
      toolName: 'webSearch'
    })
  ).toMatchObject({
    label: 'Failed while using web search',
    ok: false,
    toolName: 'webSearch'
  });
});

test('truncates oversized JSON payloads', () => {
  const truncated = truncateJson('n'.repeat(2_050));
  expect(truncated).toHaveLength(2_001);
  expect(truncated?.endsWith('…')).toBe(true);
});
