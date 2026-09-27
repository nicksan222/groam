import { expect, test } from 'vitest';
import { assistantAgents, assistantCapabilityIds } from '#ai/agents/catalog';
import { issueAgent } from '#ai/agents/issue/definition';
import { reviewerAgent } from '#ai/agents/reviewer/definition';
import {
  type AgentToolSpec,
  assistantToolSpecList,
  assistantToolSpecs,
  capabilitiesForAgent,
  cardForToolName,
  specForToolName,
  toolSpecsFor
} from './specs';

const agentOrder = ['groam', 'issue', 'reviewer'] as const;

test('every spec key matches its entry id', () => {
  for (const id of assistantCapabilityIds) {
    expect(assistantToolSpecs[id].id).toBe(id);
  }
});

test('capability ids are unique and follow the spec order', () => {
  expect(new Set(assistantCapabilityIds).size).toBe(assistantCapabilityIds.length);
  expect(assistantToolSpecList.map((spec) => spec.id)).toEqual([...assistantCapabilityIds]);
});

test('every tool names at least one agent, in catalog order', () => {
  for (const spec of assistantToolSpecList) {
    expect(spec.agents.length).toBeGreaterThan(0);
    const order = spec.agents.map((agent) => agentOrder.indexOf(agent));
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    for (const agent of spec.agents) {
      expect(assistantAgents[agent]).toBeDefined();
    }
  }
});

test('groam may call every registered tool', () => {
  expect(capabilitiesForAgent('groam')).toEqual([...assistantCapabilityIds]);
});

test('worker assignments match the reviewed sets', () => {
  // Deliberate oracle: reassigning a tool means updating its spec entry AND
  // this list in the same change.
  expect(capabilitiesForAgent('issue')).toEqual([
    'context.screen.read',
    'context.workspace.find',
    'trip.activity.add',
    'trip.activity.remove',
    'trip.activity.update',
    'trip.cost.manage',
    'trip.dates.set',
    'trip.destination.add',
    'trip.destination.remove',
    'trip.destination.schedule',
    'trip.details.update',
    'trip.itinerary.extend',
    'trip.itinerary.read',
    'trip.stay.add',
    'trip.stay.remove',
    'trip.stay.update',
    'trip.status.read',
    'trip.transfer.remove',
    'trip.transfer.set',
    'trip.version.start',
    'web.search'
  ]);
  expect(capabilitiesForAgent('reviewer')).toEqual([
    'context.workspace.find',
    'trip.itinerary.read',
    'trip.status.read',
    'web.search'
  ]);
});

test('every tool declares a render card, with choice and hidden used once each', () => {
  for (const spec of assistantToolSpecList) {
    expect(['activity', 'choice', 'hidden']).toContain(spec.ui.card);
  }
  const cardIds = (card: string) =>
    assistantToolSpecList.filter((spec) => spec.ui.card === card).map((spec) => spec.id);
  expect(cardIds('choice')).toEqual(['ui.askUserChoice']);
  expect(cardIds('hidden')).toEqual(['context.screen.read']);
});

test('every spec carries guidance, and write tools carry run-log copy', () => {
  // Runtime mirror of the AgentToolSpec union: a `writeIntent` entry forces
  // `guidance` plus `eventLabel`, and read tools carry neither intent list.
  // Annotate the union: raw spec literals omit absent optionals entirely.
  const specs: readonly AgentToolSpec[] = assistantToolSpecList;
  const writeSpecs = specs.filter((spec) => spec.writeIntent !== undefined);
  expect(writeSpecs.length).toBeGreaterThan(0);
  expect(writeSpecs.length).toBeLessThan(specs.length);
  for (const spec of specs) {
    expect(spec.guidance.length).toBeGreaterThan(0);
    if (spec.writeIntent !== undefined) {
      expect(spec.writeIntent.length).toBeGreaterThan(0);
      expect(spec.eventLabel?.complete.length).toBeGreaterThan(0);
      expect(spec.eventLabel?.running.length).toBeGreaterThan(0);
    } else {
      // Read tools stay intent-free; run-log copy itself remains optional.
      expect(spec.writeIntentExact).toBeUndefined();
    }
  }
});

test('tool names are unique across specs', () => {
  const names = assistantToolSpecList.map((spec) => spec.toolName);
  expect(new Set(names).size).toBe(names.length);
});

test('tool-name lookups resolve catalog tools and default the rest', () => {
  expect(specForToolName('getItinerary')?.id).toBe('trip.itinerary.read');
  expect(specForToolName('askUserChoice')?.ui.card).toBe('choice');
  expect(specForToolName('nope-not-a-tool')).toBeNull();
  expect(cardForToolName('getItinerary')).toBe('activity');
  expect(cardForToolName('getScreenContext')).toBe('hidden');
  expect(cardForToolName('nope-not-a-tool')).toBe('activity');
});

test('agent definitions resolve the same tools as their specs', () => {
  expect(issueAgent.capabilities).toEqual(capabilitiesForAgent('issue'));
  expect(reviewerAgent.capabilities).toEqual(capabilitiesForAgent('reviewer'));
  expect(toolSpecsFor(issueAgent).map((spec) => spec.id)).toEqual(capabilitiesForAgent('issue'));
  expect(toolSpecsFor(reviewerAgent).map((spec) => spec.id)).toEqual(
    capabilitiesForAgent('reviewer')
  );
});
