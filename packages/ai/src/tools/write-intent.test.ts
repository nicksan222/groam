import { expect, test } from 'vitest';
import { type AgentToolSpec, assistantToolSpecs } from './specs';
import { requestsWriteIntent } from './write-intent';

function asks(prompt: string, id: keyof typeof assistantToolSpecs) {
  const spec: AgentToolSpec = assistantToolSpecs[id];
  return requestsWriteIntent(prompt, spec.writeIntent ?? [], spec.writeIntentExact ?? []);
}

test('explicit commands request the write, status questions do not', () => {
  expect(asks('No budget yet, but create the trip.', 'trip.create')).toBe(true);
  expect(asks('What is the trip status?', 'trip.create')).toBe(false);
  expect(asks('Who is going? What is my RSVP?', 'trip.traveler.set')).toBe(false);
  expect(asks('What is on the packing checklist?', 'trip.packing.manage')).toBe(false);
});

test('negations and retractions deny the write', () => {
  expect(asks("Don't create the trip yet.", 'trip.create')).toBe(false);
  expect(asks('Never approve this idea', 'trip.version.approve')).toBe(false);
  expect(asks("Approve the Lisbon idea—actually, don't do it", 'trip.version.approve')).toBe(false);
  expect(asks('Approve the Lisbon idea? No thanks.', 'trip.version.approve')).toBe(false);
});

test('advice questions are not writes, commands with follow-ups are', () => {
  expect(asks('Should I merge the Lisbon idea?', 'trip.version.apply')).toBe(false);
  expect(asks('Can I approve the Lisbon idea?', 'trip.version.approve')).toBe(false);
  expect(asks('Check how to approve this idea', 'trip.version.approve')).toBe(false);
  expect(asks('Merge the Lisbon idea', 'trip.version.apply')).toBe(true);
  expect(asks('Approve the Lisbon idea and then explain the result.', 'trip.version.approve')).toBe(
    true
  );
});

test('whole-message confirmations and bare go-aheads count', () => {
  expect(asks('Maybe', 'trip.traveler.set')).toBe(true);
  expect(asks('Not going.', 'trip.traveler.set')).toBe(true);
  expect(asks('Do it', 'trip.version.approve')).toBe(true);
  expect(asks('Maybe add sunscreen to the packing list.', 'trip.traveler.set')).toBe(false);
});

test('gapped intents match across filler words', () => {
  expect(asks('Change Passport to ID documents on the packing list', 'trip.packing.manage')).toBe(
    true
  );
  expect(asks('Update the trip dates.', 'trip.packing.manage')).toBe(false);
  expect(asks('Delete sunscreen from the packing list.', 'trip.packing.manage')).toBe(true);
  expect(asks('Delete my account', 'trip.packing.manage')).toBe(false);
});
