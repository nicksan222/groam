import { expect, test } from 'vitest';
import { instructionsFor } from '#ai-contracts/agents/instructions';
import { defineChatAgent, defineStandaloneAgent, isChatAgent } from './kind';

test('defineChatAgent derives mention and surface from the id', () => {
  const scout = defineChatAgent({
    capabilities: ['web.search'],
    description: 'Finds places.',
    id: 'scout',
    identity: 'You are Scout, a research specialist.',
    label: 'Scout',
    policies: ['Prefer primary sources.']
  });

  expect(scout.mention).toBe('@scout');
  expect(scout.surface).toBe('chat');
  expect(isChatAgent(scout)).toBe(true);
});

test('defineStandaloneAgent records assignable targets and policies', () => {
  const budget = defineStandaloneAgent({
    assignable: ['proposal'],
    capabilities: ['trip.status.read'],
    description: 'Checks idea costs.',
    id: 'budget',
    label: 'Budget agent',
    policies: ['Do not edit the idea.']
  });

  expect(budget.surface).toBe('standalone');
  expect(budget.assignable).toEqual(['proposal']);
  expect(isChatAgent(budget)).toBe(false);
});

test('instructionsFor assembles a new chat agent without calling a model', () => {
  const scout = defineChatAgent({
    capabilities: ['web.search'],
    description: 'Finds places.',
    id: 'scout',
    identity: 'You are Scout, a research specialist.',
    label: 'Scout',
    policies: ['Prefer primary sources.']
  });

  const instructions = instructionsFor(scout, 'private', ['Use web.search for current facts.']);
  expect(instructions).toContain('You are Scout, a research specialist.');
  expect(instructions).toContain('@scout');
  expect(instructions).toContain('Prefer primary sources.');
  expect(instructions).toContain('Use web.search for current facts.');
  expect(() => instructionsFor(scout, 'standalone', [])).toThrow(
    'scout is a chat agent and cannot run standalone'
  );
});

test('instructionsFor assembles a new standalone agent without calling a model', () => {
  const budget = defineStandaloneAgent({
    assignable: ['proposal'],
    capabilities: ['trip.status.read'],
    description: 'Checks idea costs.',
    id: 'budget',
    label: 'Budget agent',
    policies: ['Do not edit the idea.']
  });

  const instructions = instructionsFor(budget, 'standalone', ['Use trip.status.read.']);
  expect(instructions).toContain('You are Budget agent');
  expect(instructions).toContain('Do not edit the idea.');
  expect(instructions).toContain('Use trip.status.read.');
  expect(() => instructionsFor(budget, 'private', [])).toThrow('budget is not a chat agent');
});
