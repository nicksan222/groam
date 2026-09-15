import { createTool } from '@convex-dev/agent';
import type { ToolSet } from 'ai';
import { expect, test } from 'vitest';
import * as z from 'zod/v3';
import { defineCapability } from '#backend/assistant/tools/factory';
import { AssistantToolKind } from '#backend/assistant/tools/kind';
import type { Id } from '#convex-generated/dataModel';
import { createRegisteredAssistantTools } from './index';

const screen = {
  capabilities: [],
  data: '{}',
  description: 'Test screen',
  key: 'test',
  target: { kind: 'workspace' as const },
  title: 'Test'
};

function toolsFor(
  prompt: string,
  options?: {
    agentId?: 'groam' | 'issue' | 'reviewer';
    providerTools?: ToolSet;
    scope?: 'private' | 'standalone';
  }
) {
  return createRegisteredAssistantTools({
    activeTripId: 'trip-1' as Id<'trips'>,
    agentId: options?.agentId ?? 'groam',
    prompt,
    ...(options?.providerTools ? { providerTools: options.providerTools } : {}),
    screen,
    scope: options?.scope ?? 'private',
    ...(options?.scope === 'standalone' ? {} : { threadId: 'thread-1' })
  }).tools;
}

test('rejects duplicate capabilities', () => {
  expect(() =>
    AssistantToolKind.subscribe(
      defineCapability({
        create: () => null,
        id: 'trip.status.read',
        toolName: 'getTripStatusDuplicate'
      })
    )
  ).toThrow("Assistant capability 'trip.status.read' is already registered");
});

test('records every catalog tool from its registration, not a second map', () => {
  const names = AssistantToolKind.all().map((registration) => registration.toolName);
  expect(new Set(names).size).toBe(names.length);
  expect(AssistantToolKind.byToolName('getItinerary')?.id).toBe('trip.itinerary.read');
  expect(AssistantToolKind.byToolName('getTripStatus')?.id).toBe('trip.status.read');
});

test('selects every groam capability when building the runtime tool set', () => {
  const tools = toolsFor('What is the trip status?');
  expect(Object.keys(tools)).toEqual(
    expect.arrayContaining([
      'addActivity',
      'addDestination',
      'addStay',
      'askUserChoice',
      'createTripIssue',
      'createTripProposal',
      'extendItinerary',
      'findWorkspaceContext',
      'getChatContext',
      'getItinerary',
      'getScreenContext',
      'getTripStatus',
      'removeActivity',
      'removeDestination',
      'removeStay',
      'removeTransfer',
      'setChatContext',
      'setDestinationSchedule',
      'setItineraryCost',
      'setTransfer',
      'setTripDates',
      'startTripVersion',
      'updateActivity',
      'updateStay',
      'updateTripDetails',
      'applyTripVersion',
      'approveTripVersion',
      'listPacking',
      'managePacking',
      'setTravelerRsvp'
    ])
  );
});

test('preserves provider-native tool names for eligible agents', () => {
  const providerTools = {
    google_search: createTool({
      execute: async () => null,
      inputSchema: z.object({})
    })
  };
  expect(Object.keys(toolsFor('Research this', { providerTools }))).toContain('google_search');
});

test('leaves registered tools visible for model selection while guarding writes at execution', async () => {
  const readTools = toolsFor('What is the trip status?');
  expect(Object.keys(readTools)).toEqual(
    expect.arrayContaining([
      'addActivity',
      'addStay',
      'createTripIssue',
      'createTripProposal',
      'getTripStatus',
      'setItineraryCost',
      'setTripDates',
      'startTripVersion'
    ])
  );
  await expect(
    Promise.resolve().then(() =>
      readTools.createTripProposal?.execute?.({ name: 'Japan' }, {} as never)
    )
  ).rejects.toThrow('requires an explicit traveler request');

  const explicitCreate = toolsFor('No budget yet, but create the trip.');
  await expect(
    Promise.resolve().then(() =>
      explicitCreate.createTripProposal?.execute?.({ name: 'Japan' }, {} as never)
    )
  ).rejects.toThrow('To use a Convex tool');

  const explicitDates = toolsFor('Set these dates: 2027-01-01 through 2027-01-10.');
  expect(explicitDates.manageTrip).toBeUndefined();
  await expect(
    Promise.resolve().then(() =>
      explicitDates.setTripDates?.execute?.(
        { endDate: '2027-01-10', startDate: '2027-01-01' },
        {} as never
      )
    )
  ).rejects.toThrow('To use a Convex tool');

  const negatedCreate = toolsFor("Don't create the trip yet.");
  await expect(
    Promise.resolve().then(() =>
      negatedCreate.createTripProposal?.execute?.({ name: 'Japan' }, {} as never)
    )
  ).rejects.toThrow('requires an explicit traveler request');
});

test('issue and reviewer agents take a subset of the shared registry without chat tools', () => {
  const issueTools = Object.keys(
    toolsFor('Proceed and implement this issue.', { agentId: 'issue', scope: 'standalone' })
  );
  expect(issueTools).toEqual(
    expect.arrayContaining([
      'addActivity',
      'addDestination',
      'extendItinerary',
      'getItinerary',
      'getTripStatus',
      'removeActivity',
      'setDestinationSchedule',
      'setTransfer',
      'startTripVersion',
      'updateActivity',
      'updateTripDetails'
    ])
  );
  expect(issueTools).not.toContain('askUserChoice');
  expect(issueTools).not.toContain('getChatContext');
  expect(issueTools).not.toContain('setChatContext');
  expect(issueTools).not.toContain('createTripIssue');
  expect(issueTools).not.toContain('createTripProposal');
  expect(issueTools).not.toContain('applyTripVersion');
  expect(issueTools).not.toContain('approveTripVersion');
  expect(issueTools).not.toContain('listPacking');
  expect(issueTools).not.toContain('managePacking');
  expect(issueTools).not.toContain('setTravelerRsvp');

  const reviewTools = Object.keys(
    toolsFor('Review this idea.', { agentId: 'reviewer', scope: 'standalone' })
  );
  expect(reviewTools).toEqual(
    expect.arrayContaining(['findWorkspaceContext', 'getItinerary', 'getTripStatus'])
  );
  expect(reviewTools).not.toContain('askUserChoice');
  expect(reviewTools).not.toContain('createTripProposal');
  expect(reviewTools).not.toContain('startTripVersion');
  expect(reviewTools).not.toContain('applyTripVersion');
  expect(reviewTools).not.toContain('approveTripVersion');
  expect(reviewTools).not.toContain('listPacking');
  expect(reviewTools).not.toContain('managePacking');
  expect(reviewTools).not.toContain('setTravelerRsvp');
});

test('treats RSVP changes as write intent and ignores status questions', async () => {
  const questionTools = toolsFor('Who is going? What is my RSVP?');
  await expect(
    Promise.resolve().then(() =>
      questionTools.setTravelerRsvp?.execute?.({ status: 'going' }, {} as never)
    )
  ).rejects.toThrow('requires an explicit traveler request');

  const writeTools = toolsFor('Please set my RSVP to going.');
  await expect(
    Promise.resolve().then(() =>
      writeTools.setTravelerRsvp?.execute?.({ status: 'going' }, {} as never)
    )
  ).rejects.toThrow('To use a Convex tool');

  const spoken = toolsFor("I'm going.");
  await expect(
    Promise.resolve().then(() =>
      spoken.setTravelerRsvp?.execute?.({ status: 'going' }, {} as never)
    )
  ).rejects.toThrow('To use a Convex tool');

  const declined = toolsFor("I can't go.");
  await expect(
    Promise.resolve().then(() =>
      declined.setTravelerRsvp?.execute?.({ status: 'not_going' }, {} as never)
    )
  ).rejects.toThrow('To use a Convex tool');

  const canYouUpdate = toolsFor('Could you update my RSVP?');
  await expect(
    Promise.resolve().then(() =>
      canYouUpdate.setTravelerRsvp?.execute?.({ status: 'going' }, {} as never)
    )
  ).rejects.toThrow('To use a Convex tool');

  const maybe = toolsFor('Maybe');
  await expect(
    Promise.resolve().then(() => maybe.setTravelerRsvp?.execute?.({ status: 'maybe' }, {} as never))
  ).rejects.toThrow('To use a Convex tool');

  const notGoing = toolsFor('Not going.');
  await expect(
    Promise.resolve().then(() =>
      notGoing.setTravelerRsvp?.execute?.({ status: 'not_going' }, {} as never)
    )
  ).rejects.toThrow('To use a Convex tool');

  const packingMaybe = toolsFor('Maybe add sunscreen to the packing list.');
  await expect(
    Promise.resolve().then(() =>
      packingMaybe.setTravelerRsvp?.execute?.({ status: 'maybe' }, {} as never)
    )
  ).rejects.toThrow('requires an explicit traveler request');
});

test('treats packing add and check-off phrases as write intent', async () => {
  const questionTools = toolsFor('What is on the packing checklist?');
  await expect(
    Promise.resolve().then(() =>
      questionTools.managePacking?.execute?.({ action: 'list' }, {} as never)
    )
  ).rejects.toThrow('requires an explicit traveler request');

  const addTools = toolsFor('Add sunscreen to the packing list.');
  await expect(
    Promise.resolve().then(() =>
      addTools.managePacking?.execute?.({ action: 'add', label: 'sunscreen' }, {} as never)
    )
  ).rejects.toThrow('To use a Convex tool');

  const checkTools = toolsFor('Check off Passport on the packing list.');
  await expect(
    Promise.resolve().then(() =>
      checkTools.managePacking?.execute?.(
        { action: 'update', itemId: 'item-1', packed: true },
        {} as never
      )
    )
  ).rejects.toThrow('To use a Convex tool');

  const removeTools = toolsFor('Remove Passport from the packing list.');
  await expect(
    Promise.resolve().then(() =>
      removeTools.managePacking?.execute?.({ action: 'remove', itemId: 'item-1' }, {} as never)
    )
  ).rejects.toThrow('To use a Convex tool');

  const packTools = toolsFor('Pack Passport.');
  await expect(
    Promise.resolve().then(() =>
      packTools.managePacking?.execute?.(
        { action: 'update', itemId: 'item-1', packed: true },
        {} as never
      )
    )
  ).rejects.toThrow('To use a Convex tool');

  const updateTools = toolsFor('Update Passport to ID documents on the packing list');
  await expect(
    Promise.resolve().then(() =>
      updateTools.managePacking?.execute?.(
        { action: 'update', itemId: 'item-1', label: 'ID documents' },
        {} as never
      )
    )
  ).rejects.toThrow('To use a Convex tool');

  const changeTools = toolsFor('Change Passport to ID documents on the packing list');
  await expect(
    Promise.resolve().then(() =>
      changeTools.managePacking?.execute?.(
        { action: 'update', itemId: 'item-1', label: 'ID documents' },
        {} as never
      )
    )
  ).rejects.toThrow('To use a Convex tool');

  const dateTools = toolsFor('Update the trip dates.');
  await expect(
    Promise.resolve().then(() =>
      dateTools.managePacking?.execute?.(
        { action: 'update', itemId: 'item-1', label: 'ID documents' },
        {} as never
      )
    )
  ).rejects.toThrow('requires an explicit traveler request');

  const rsvpTools = toolsFor('Change my RSVP to maybe.');
  await expect(
    Promise.resolve().then(() =>
      rsvpTools.managePacking?.execute?.(
        { action: 'update', itemId: 'item-1', packed: true },
        {} as never
      )
    )
  ).rejects.toThrow('requires an explicit traveler request');

  const updateThenExplain = toolsFor('Update the packing list, then explain why');
  await expect(
    Promise.resolve().then(() =>
      updateThenExplain.managePacking?.execute?.(
        { action: 'update', itemId: 'item-1', label: 'Passport' },
        {} as never
      )
    )
  ).rejects.toThrow('To use a Convex tool');

  const listed = toolsFor('Passport is on the packing list.');
  await expect(
    Promise.resolve().then(() => listed.managePacking?.execute?.({ action: 'list' }, {} as never))
  ).rejects.toThrow('requires an explicit traveler request');

  const deleteDestination = toolsFor('Delete the Lisbon destination');
  await expect(
    Promise.resolve().then(() =>
      deleteDestination.managePacking?.execute?.(
        { action: 'remove', itemId: 'item-1' },
        {} as never
      )
    )
  ).rejects.toThrow('requires an explicit traveler request');

  const deleteAccount = toolsFor('Delete my account');
  await expect(
    Promise.resolve().then(() =>
      deleteAccount.managePacking?.execute?.({ action: 'remove', itemId: 'item-1' }, {} as never)
    )
  ).rejects.toThrow('requires an explicit traveler request');

  const deletePackingItem = toolsFor('Delete sunscreen from the packing list.');
  await expect(
    Promise.resolve().then(() =>
      deletePackingItem.managePacking?.execute?.(
        { action: 'remove', itemId: 'item-1' },
        {} as never
      )
    )
  ).rejects.toThrow('To use a Convex tool');

  const canYouAdd = toolsFor('Can you add sunscreen?');
  await expect(
    Promise.resolve().then(() =>
      canYouAdd.managePacking?.execute?.({ action: 'add', label: 'sunscreen' }, {} as never)
    )
  ).rejects.toThrow('To use a Convex tool');
});

test('keeps merge advice behind the apply write gate', async () => {
  const questionTools = toolsFor('Should I merge the Lisbon idea?');
  await expect(
    Promise.resolve().then(() =>
      questionTools.applyTripVersion?.execute?.({ proposalId: 'proposal-1' }, {} as never)
    )
  ).rejects.toThrow('requires an explicit traveler request');

  const goAheadAdvice = toolsFor('Should I go ahead and merge?');
  await expect(
    Promise.resolve().then(() =>
      goAheadAdvice.applyTripVersion?.execute?.({ proposalId: 'proposal-1' }, {} as never)
    )
  ).rejects.toThrow('requires an explicit traveler request');

  const namedApply = toolsFor('Apply the Lisbon idea.');
  await expect(
    Promise.resolve().then(() =>
      namedApply.applyTripVersion?.execute?.({ proposalId: 'proposal-1' }, {} as never)
    )
  ).rejects.toThrow('To use a Convex tool');

  const namedMerge = toolsFor('Merge the Lisbon idea');
  await expect(
    Promise.resolve().then(() =>
      namedMerge.applyTripVersion?.execute?.({ proposalId: 'proposal-1' }, {} as never)
    )
  ).rejects.toThrow('To use a Convex tool');

  const writeTools = toolsFor('Please merge the Lisbon idea into the trip.');
  await expect(
    Promise.resolve().then(() =>
      writeTools.applyTripVersion?.execute?.({ proposalId: 'proposal-1' }, {} as never)
    )
  ).rejects.toThrow('To use a Convex tool');
});

test('treats approval withdrawal as explicit write intent', async () => {
  const questionTools = toolsFor('Should I approve the Lisbon idea?');
  await expect(
    Promise.resolve().then(() =>
      questionTools.approveTripVersion?.execute?.(
        { approved: true, proposalId: 'proposal-1' },
        {} as never
      )
    )
  ).rejects.toThrow('requires an explicit traveler request');

  const politeAdvice = toolsFor('Can you please tell me whether I should approve this idea?');
  await expect(
    Promise.resolve().then(() =>
      politeAdvice.approveTripVersion?.execute?.(
        { approved: true, proposalId: 'proposal-1' },
        {} as never
      )
    )
  ).rejects.toThrow('requires an explicit traveler request');

  const yesOrNo = toolsFor('Should I approve the Lisbon idea—yes or no?');
  await expect(
    Promise.resolve().then(() =>
      yesOrNo.approveTripVersion?.execute?.(
        { approved: true, proposalId: 'proposal-1' },
        {} as never
      )
    )
  ).rejects.toThrow('requires an explicit traveler request');

  const canIApprove = toolsFor('Can I approve the Lisbon idea?');
  await expect(
    Promise.resolve().then(() =>
      canIApprove.approveTripVersion?.execute?.(
        { approved: true, proposalId: 'proposal-1' },
        {} as never
      )
    )
  ).rejects.toThrow('requires an explicit traveler request');

  const pleaseCanIApprove = toolsFor('Please can I approve the Lisbon idea?');
  await expect(
    Promise.resolve().then(() =>
      pleaseCanIApprove.approveTripVersion?.execute?.(
        { approved: true, proposalId: 'proposal-1' },
        {} as never
      )
    )
  ).rejects.toThrow('requires an explicit traveler request');

  const whatSteps = toolsFor('What steps do I need to approve this idea');
  await expect(
    Promise.resolve().then(() =>
      whatSteps.approveTripVersion?.execute?.(
        { approved: true, proposalId: 'proposal-1' },
        {} as never
      )
    )
  ).rejects.toThrow('requires an explicit traveler request');

  const isItOkay = toolsFor('Is it okay to approve this idea');
  await expect(
    Promise.resolve().then(() =>
      isItOkay.approveTripVersion?.execute?.(
        { approved: true, proposalId: 'proposal-1' },
        {} as never
      )
    )
  ).rejects.toThrow('requires an explicit traveler request');

  const doINeed = toolsFor('Do I need to approve this idea');
  await expect(
    Promise.resolve().then(() =>
      doINeed.approveTripVersion?.execute?.(
        { approved: true, proposalId: 'proposal-1' },
        {} as never
      )
    )
  ).rejects.toThrow('requires an explicit traveler request');

  const doApprove = toolsFor('Do approve this idea');
  await expect(
    Promise.resolve().then(() =>
      doApprove.approveTripVersion?.execute?.(
        { approved: true, proposalId: 'proposal-1' },
        {} as never
      )
    )
  ).rejects.toThrow('To use a Convex tool');

  const doIt = toolsFor('Do it');
  await expect(
    Promise.resolve().then(() =>
      doIt.approveTripVersion?.execute?.({ approved: true, proposalId: 'proposal-1' }, {} as never)
    )
  ).rejects.toThrow('To use a Convex tool');

  const explainHowTo = toolsFor('Explain how to approve this idea');
  await expect(
    Promise.resolve().then(() =>
      explainHowTo.approveTripVersion?.execute?.(
        { approved: true, proposalId: 'proposal-1' },
        {} as never
      )
    )
  ).rejects.toThrow('requires an explicit traveler request');

  const politeExplain = toolsFor('Please explain how to approve this idea');
  await expect(
    Promise.resolve().then(() =>
      politeExplain.approveTripVersion?.execute?.(
        { approved: true, proposalId: 'proposal-1' },
        {} as never
      )
    )
  ).rejects.toThrow('requires an explicit traveler request');

  const distantNegation = toolsFor(
    "Don't ever under any circumstances whatsoever approve this idea"
  );
  await expect(
    Promise.resolve().then(() =>
      distantNegation.approveTripVersion?.execute?.(
        { approved: true, proposalId: 'proposal-1' },
        {} as never
      )
    )
  ).rejects.toThrow('requires an explicit traveler request');

  const noThanks = toolsFor('Approve the Lisbon idea? No thanks.');
  await expect(
    Promise.resolve().then(() =>
      noThanks.approveTripVersion?.execute?.(
        { approved: true, proposalId: 'proposal-1' },
        {} as never
      )
    )
  ).rejects.toThrow('requires an explicit traveler request');

  const trailingNo = toolsFor('Approve the Lisbon idea? No.');
  await expect(
    Promise.resolve().then(() =>
      trailingNo.approveTripVersion?.execute?.(
        { approved: true, proposalId: 'proposal-1' },
        {} as never
      )
    )
  ).rejects.toThrow('requires an explicit traveler request');

  const retracted = toolsFor("Approve the Lisbon idea—actually, don't do it");
  await expect(
    Promise.resolve().then(() =>
      retracted.approveTripVersion?.execute?.(
        { approved: true, proposalId: 'proposal-1' },
        {} as never
      )
    )
  ).rejects.toThrow('requires an explicit traveler request');

  const explainApprove = toolsFor('Could you explain how to approve this idea?');
  await expect(
    Promise.resolve().then(() =>
      explainApprove.approveTripVersion?.execute?.(
        { approved: true, proposalId: 'proposal-1' },
        {} as never
      )
    )
  ).rejects.toThrow('requires an explicit traveler request');

  const howApply = toolsFor('How do I apply this idea?');
  await expect(
    Promise.resolve().then(() =>
      howApply.applyTripVersion?.execute?.({ proposalId: 'proposal-1' }, {} as never)
    )
  ).rejects.toThrow('requires an explicit traveler request');

  const canWeApprove = toolsFor('Can we approve the Lisbon idea?');
  await expect(
    Promise.resolve().then(() =>
      canWeApprove.approveTripVersion?.execute?.(
        { approved: true, proposalId: 'proposal-1' },
        {} as never
      )
    )
  ).rejects.toThrow('requires an explicit traveler request');

  const tellMeHowTo = toolsFor('Tell me how to approve this idea');
  await expect(
    Promise.resolve().then(() =>
      tellMeHowTo.approveTripVersion?.execute?.(
        { approved: true, proposalId: 'proposal-1' },
        {} as never
      )
    )
  ).rejects.toThrow('requires an explicit traveler request');

  const showMeHowTo = toolsFor('Show me how to approve this idea');
  await expect(
    Promise.resolve().then(() =>
      showMeHowTo.approveTripVersion?.execute?.(
        { approved: true, proposalId: 'proposal-1' },
        {} as never
      )
    )
  ).rejects.toThrow('requires an explicit traveler request');

  const tellMeWhether = toolsFor('Tell me whether I should approve this idea');
  await expect(
    Promise.resolve().then(() =>
      tellMeWhether.approveTripVersion?.execute?.(
        { approved: true, proposalId: 'proposal-1' },
        {} as never
      )
    )
  ).rejects.toThrow('requires an explicit traveler request');

  const neverApprove = toolsFor('Never approve this idea');
  await expect(
    Promise.resolve().then(() =>
      neverApprove.approveTripVersion?.execute?.(
        { approved: true, proposalId: 'proposal-1' },
        {} as never
      )
    )
  ).rejects.toThrow('requires an explicit traveler request');

  const shouldNotApprove = toolsFor('I should not approve this idea');
  await expect(
    Promise.resolve().then(() =>
      shouldNotApprove.approveTripVersion?.execute?.(
        { approved: true, proposalId: 'proposal-1' },
        {} as never
      )
    )
  ).rejects.toThrow('requires an explicit traveler request');

  const shouldntApprove = toolsFor("I shouldn't approve this idea");
  await expect(
    Promise.resolve().then(() =>
      shouldntApprove.approveTripVersion?.execute?.(
        { approved: true, proposalId: 'proposal-1' },
        {} as never
      )
    )
  ).rejects.toThrow('requires an explicit traveler request');

  const cannotApprove = toolsFor('I cannot approve this idea');
  await expect(
    Promise.resolve().then(() =>
      cannotApprove.approveTripVersion?.execute?.(
        { approved: true, proposalId: 'proposal-1' },
        {} as never
      )
    )
  ).rejects.toThrow('requires an explicit traveler request');

  const notGoingToApprove = toolsFor('I am not going to approve this idea');
  await expect(
    Promise.resolve().then(() =>
      notGoingToApprove.approveTripVersion?.execute?.(
        { approved: true, proposalId: 'proposal-1' },
        {} as never
      )
    )
  ).rejects.toThrow('requires an explicit traveler request');

  const wouldItBeOkay = toolsFor('Would it be okay to approve this idea?');
  await expect(
    Promise.resolve().then(() =>
      wouldItBeOkay.approveTripVersion?.execute?.(
        { approved: true, proposalId: 'proposal-1' },
        {} as never
      )
    )
  ).rejects.toThrow('requires an explicit traveler request');

  const wontApprove = toolsFor("I won't approve this idea");
  await expect(
    Promise.resolve().then(() =>
      wontApprove.approveTripVersion?.execute?.(
        { approved: true, proposalId: 'proposal-1' },
        {} as never
      )
    )
  ).rejects.toThrow('requires an explicit traveler request');

  const declineThenPack = toolsFor("I can't go. Add sunscreen to the packing list.");
  await expect(
    Promise.resolve().then(() =>
      declineThenPack.managePacking?.execute?.({ action: 'add', label: 'sunscreen' }, {} as never)
    )
  ).rejects.toThrow('To use a Convex tool');

  const laterHowTo = toolsFor('I need to know how to approve this idea');
  await expect(
    Promise.resolve().then(() =>
      laterHowTo.approveTripVersion?.execute?.(
        { approved: true, proposalId: 'proposal-1' },
        {} as never
      )
    )
  ).rejects.toThrow('requires an explicit traveler request');

  const checkWhether = toolsFor('Check whether I should approve this idea');
  await expect(
    Promise.resolve().then(() =>
      checkWhether.approveTripVersion?.execute?.(
        { approved: true, proposalId: 'proposal-1' },
        {} as never
      )
    )
  ).rejects.toThrow('requires an explicit traveler request');

  const updateMeHow = toolsFor('Update me on how to approve this idea');
  await expect(
    Promise.resolve().then(() =>
      updateMeHow.approveTripVersion?.execute?.(
        { approved: true, proposalId: 'proposal-1' },
        {} as never
      )
    )
  ).rejects.toThrow('requires an explicit traveler request');

  const checkIf = toolsFor('Check if I should approve this idea');
  await expect(
    Promise.resolve().then(() =>
      checkIf.approveTripVersion?.execute?.(
        { approved: true, proposalId: 'proposal-1' },
        {} as never
      )
    )
  ).rejects.toThrow('requires an explicit traveler request');

  const checkHow = toolsFor('Check how I should approve this idea');
  await expect(
    Promise.resolve().then(() =>
      checkHow.approveTripVersion?.execute?.(
        { approved: true, proposalId: 'proposal-1' },
        {} as never
      )
    )
  ).rejects.toThrow('requires an explicit traveler request');

  const checkHowTo = toolsFor('Check how to approve this idea');
  await expect(
    Promise.resolve().then(() =>
      checkHowTo.approveTripVersion?.execute?.(
        { approved: true, proposalId: 'proposal-1' },
        {} as never
      )
    )
  ).rejects.toThrow('requires an explicit traveler request');

  const bookMe = toolsFor('Do book me a hotel');
  await expect(
    Promise.resolve().then(() =>
      bookMe.addStay?.execute?.({ destinationId: 'dest-1', name: 'Hotel' }, {} as never)
    )
  ).rejects.toThrow('To use a Convex tool');

  const markMeGoing = toolsFor('Mark me as going, then explain');
  await expect(
    Promise.resolve().then(() =>
      markMeGoing.setTravelerRsvp?.execute?.({ status: 'going' }, {} as never)
    )
  ).rejects.toThrow('To use a Convex tool');

  const ifApprove = toolsFor('If I approve this idea, will it merge automatically?');
  await expect(
    Promise.resolve().then(() =>
      ifApprove.approveTripVersion?.execute?.(
        { approved: true, proposalId: 'proposal-1' },
        {} as never
      )
    )
  ).rejects.toThrow('requires an explicit traveler request');

  const writeThenExplain = toolsFor('Approve the Lisbon idea and then explain the result.');
  await expect(
    Promise.resolve().then(() =>
      writeThenExplain.approveTripVersion?.execute?.(
        { approved: true, proposalId: 'proposal-1' },
        {} as never
      )
    )
  ).rejects.toThrow('To use a Convex tool');

  const tools = toolsFor('Please withdraw my approval on the Lisbon idea.');
  await expect(
    Promise.resolve().then(() =>
      tools.approveTripVersion?.execute?.(
        { approved: false, proposalId: 'proposal-1' },
        {} as never
      )
    )
  ).rejects.toThrow('To use a Convex tool');
});

test('assignment is enough write intent for the Issue agent', async () => {
  const tools = toolsFor(
    'Proceed and implement this issue.\nDo not create additional issues. Do not close this issue.',
    { agentId: 'issue', scope: 'standalone' }
  );
  await expect(
    Promise.resolve().then(() => tools.startTripVersion?.execute?.({}, {} as never))
  ).rejects.toThrow('To use a Convex tool');
});

test('chat-only tools stay off the shared registry when the runtime is standalone', () => {
  const tools = Object.keys(toolsFor('What is attached?', { scope: 'standalone' }));
  expect(tools).not.toContain('askUserChoice');
  expect(tools).not.toContain('getChatContext');
  expect(tools).not.toContain('setChatContext');
});
