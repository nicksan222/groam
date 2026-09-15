import { expect, test } from 'vitest';
import {
  agentAssignableTo,
  assistantAgentIds,
  assistantAgentList,
  assistantAgents,
  assistantCapabilityIds,
  assistantCapabilityReceipt,
  assistantContextMessage,
  assistantThreadSummary,
  assistantToolActivity,
  chatAgentIds,
  isIssueAssignableAgentId,
  isProposalAssignableAgentId,
  issueAssignableAgentIds,
  mentionedAssistantAgent,
  parseAssistantContextMessage,
  parseAssistantThreadSummary,
  parseAssistantToolActivity,
  proposalAssignableAgentIds
} from './index';

test('round-trips versioned tool activity metadata', () => {
  const activity = assistantToolActivity(
    'trip.dates.set',
    'Updated trip dates',
    '2027-01-01 – 2027-01-10'
  );
  expect(activity.id).toBe(assistantCapabilityReceipt('trip.dates.set'));
  expect(parseAssistantToolActivity({ activity })).toEqual(activity);
  expect(parseAssistantToolActivity({ activity: { ...activity, version: 2 } })).toBeNull();
});

test('gives groam every registered capability', () => {
  expect(assistantAgents.groam.capabilities).toEqual(assistantCapabilityIds);
});

test('registers one definition per agent id with capabilities from the catalog', () => {
  expect(assistantAgentList.map((agent) => agent.id)).toEqual([...assistantAgentIds]);
  for (const agent of assistantAgentList) {
    expect(new Set(agent.capabilities).size).toBe(agent.capabilities.length);
    for (const capability of agent.capabilities) {
      expect(assistantCapabilityIds).toContain(capability);
    }
  }
});

test('derives chat mentions from agent ids', () => {
  for (const id of chatAgentIds) {
    expect(assistantAgents[id].mention).toBe(`@${id}`);
    expect(assistantAgents[id].surface).toBe('chat');
  }
});

test('round-trips recently active chat metadata and reads legacy summaries', () => {
  const tag = { id: 'trip-1', kind: 'trip' as const, label: 'Portugal', tripId: 'trip-1' };
  const screenContext = JSON.stringify({ key: 'trip:trip-1:itinerary' });
  expect(
    parseAssistantThreadSummary(assistantThreadSummary('organization-1', [tag], 42, screenContext))
  ).toEqual({
    kind: 'workspace-assistant',
    organizationId: 'organization-1',
    screenContext,
    tags: [tag],
    updatedAt: 42,
    version: 2
  });

  expect(
    parseAssistantThreadSummary(
      JSON.stringify({
        kind: 'workspace-assistant',
        organizationId: 'organization-1',
        tags: [],
        version: 1
      })
    )
  ).toEqual({
    kind: 'workspace-assistant',
    organizationId: 'organization-1',
    tags: [],
    version: 1
  });
});

test('round-trips current and legacy screen context snapshots', () => {
  const snapshot = {
    agent: 'groam' as const,
    key: 'trip:trip-1:itinerary',
    tags: [{ id: 'trip-1', kind: 'trip' as const, label: 'Portugal', tripId: 'trip-1' }],
    target: { kind: 'trip' as const, section: 'itinerary', tripId: 'trip-1' },
    title: 'Portugal itinerary'
  };
  expect(parseAssistantContextMessage(assistantContextMessage(snapshot))).toEqual(snapshot);
  expect(
    parseAssistantContextMessage(
      `Groam screen context snapshot (JSON):\n${JSON.stringify(snapshot)}`
    )
  ).toEqual(snapshot);
  expect(
    parseAssistantContextMessage(
      `Groam interaction context (JSON):\n${JSON.stringify({ ...snapshot, agent: 'issue' })}`
    )
  ).toBeNull();
});

test('detects whole-token @groam mentions', () => {
  expect(mentionedAssistantAgent('@groam help')).toEqual(assistantAgents.groam);
  expect(mentionedAssistantAgent('hey @groam')).toEqual(assistantAgents.groam);
  expect(mentionedAssistantAgent('email@groam.com')).toBeNull();
  expect(mentionedAssistantAgent('no mention here')).toBeNull();
});

test('binds each agent kind to one surface and keeps chat mentions off workers', () => {
  expect(assistantAgents.groam.surface).toBe('chat');
  expect(assistantAgents.groam.mention).toBe('@groam');
  expect(assistantAgents.issue.surface).toBe('standalone');
  expect(assistantAgents.issue.assignable).toEqual(['issue']);
  expect(assistantAgents.reviewer.surface).toBe('standalone');
  expect(assistantAgents.reviewer.assignable).toEqual(['proposal']);
  expect(isIssueAssignableAgentId('issue')).toBe(true);
  expect(isIssueAssignableAgentId('groam')).toBe(false);
  expect(isProposalAssignableAgentId('reviewer')).toBe(true);
  expect(isProposalAssignableAgentId('groam')).toBe(false);
  expect(mentionedAssistantAgent('@issue help')).toBeNull();
  expect(mentionedAssistantAgent('@reviewer look')).toBeNull();
});

test('assignable id lists match standalone agent definitions', () => {
  const issueIds = assistantAgentList.flatMap((agent) =>
    agentAssignableTo(agent, 'issue') ? [agent.id] : []
  );
  const proposalIds = assistantAgentList.flatMap((agent) =>
    agentAssignableTo(agent, 'proposal') ? [agent.id] : []
  );
  expect(issueIds).toEqual([...issueAssignableAgentIds]);
  expect(proposalIds).toEqual([...proposalAssignableAgentIds]);
});
