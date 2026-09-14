import { expect, test } from 'vitest';
import { agentRunEventLabels } from './events';
import { eventsFromStep, thoughtFromStep } from './step-event';

test('records reasoning text as a thought before tool results', () => {
  expect(
    eventsFromStep({
      reasoningText: 'Check whether day 3 still has a transfer.',
      toolResults: [
        {
          input: { tripId: 'trip-1' },
          output: { itinerary: { tripName: 'Lisbon' } },
          toolName: 'getItinerary'
        }
      ]
    })
  ).toEqual([
    {
      detail: 'Check whether day 3 still has a transfer.',
      kind: 'thought',
      label: agentRunEventLabels.thought
    },
    {
      input: '{"tripId":"trip-1"}',
      kind: 'tool',
      label: 'Read itinerary',
      ok: true,
      output: '{"itinerary":{"tripName":"Lisbon"}}',
      toolName: 'getItinerary'
    }
  ]);
});

test('records chain-of-thought text when the step also called tools', () => {
  expect(
    thoughtFromStep({
      text: 'I should read the proposed itinerary first.',
      toolCalls: [{ toolName: 'getItinerary' }]
    })
  ).toBe('I should read the proposed itinerary first.');
});

test('does not treat the final structured report as a thought', () => {
  expect(
    thoughtFromStep({
      text: '{"comments":[],"summary":"Looks sound."}'
    })
  ).toBeUndefined();
});

test('reads reasoning from content parts', () => {
  expect(
    thoughtFromStep({
      content: [
        { text: 'Dates look tight.', type: 'reasoning' },
        { text: 'Need a transfer check.', type: 'reasoning' }
      ]
    })
  ).toBe('Dates look tight.\nNeed a transfer check.');
});
