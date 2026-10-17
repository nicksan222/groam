import { expect, test } from 'vite-plus/test';
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

const allows: [string, keyof typeof assistantToolSpecs][] = [
  ['Remove the museum', 'trip.version.start'],
  ['Move dinner to 8pm', 'trip.version.start'],
  ['Rename the trip to Summer', 'trip.version.start'],
  ['Check off sunscreen', 'trip.version.start'],
  ['Cancel the hotel', 'trip.version.start'],
  ['Add two more days to Lisbon', 'trip.version.start'],
  ['add 2 days', 'trip.itinerary.extend'],
  ['Add two more days to Lisbon', 'trip.itinerary.extend'],
  ['Remove the hotel', 'trip.stay.remove'],
  ['cancel the hotel', 'trip.stay.remove'],
  ['remove the flight', 'trip.transfer.remove'],
  ['change the hotel to the Ritz', 'trip.stay.update'],
  ['remove Porto', 'trip.destination.remove'],
  ['Add Porto as a stop', 'trip.destination.add'],
  ['Create an issue for visas', 'trip.issue.create'],
  ['Move the trip to June 3-10', 'trip.dates.set'],
  ['Book a hotel in Lisbon', 'trip.stay.add']
];

test.each(allows)('%s allows %s', (prompt, id) => {
  expect(asks(prompt, id)).toBe(true);
});

const denies: [string, keyof typeof assistantToolSpecs][] = [
  ["Don't remove the hotel", 'trip.stay.remove'],
  ['Should I remove the hotel?', 'trip.stay.remove'],
  ['cancel the hotel', 'trip.stay.add'],
  ['Remove the hotel', 'trip.stay.add'],
  ['Can you confirm what time the museum opens?', 'trip.version.apply'],
  ['Yes, what is the weather like?', 'trip.version.apply'],
  ["Let's go with that restaurant idea for dinner tips", 'trip.version.apply'],
  ['Yes, but not the hotel', 'trip.version.apply'],
  ['Yes, but not the hotel', 'trip.destination.remove'],
  ['Ok except the museum', 'trip.version.apply']
];

test.each(denies)('%s denies %s', (prompt, id) => {
  expect(asks(prompt, id)).toBe(false);
});

test.each([
  'yes',
  'Yes please',
  'go ahead',
  'Do it',
  'confirm',
  'Yes, go with option 2',
  'Yes, go ahead and add it',
  'Yes go ahead and do it',
  'ok do it please'
])('short confirmation %s unlocks destructive writes', (prompt) => {
  for (const id of [
    'trip.version.apply',
    'trip.destination.remove',
    'trip.version.approve'
  ] as const) {
    expect(asks(prompt, id)).toBe(true);
  }
});

test('a long packing item name still reaches the packing list', () => {
  expect(
    asks('Update the Passport and travel insurance item on the packing list', 'trip.packing.manage')
  ).toBe(true);
});
