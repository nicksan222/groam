import { expect, test } from 'vite-plus/test';
import {
  assigneeKey,
  assignmentMessage,
  issueAgentAssignee,
  presentAssignee
} from '#convex/modules/travel/issues/assignee';

const person = { kind: 'user' as const, name: 'Ada', userId: 'user-1' };
const agent = { agentId: 'issue' as const, kind: 'agent' as const, name: 'Old name' };

test('presentAssignee keeps people and presents agents as the Issue agent', () => {
  expect(presentAssignee(person)).toBe(person);
  expect(presentAssignee(agent)).toEqual(issueAgentAssignee);
});

test('assigneeKey is null when unassigned and collapses agents to one key', () => {
  expect(assigneeKey(undefined)).toBeNull();
  expect(assigneeKey(null)).toBeNull();
  expect(assigneeKey(person)).toBe('user:user-1');
  expect(assigneeKey(agent)).toBe(`agent:${issueAgentAssignee.agentId}`);
});

test('assignmentMessage names the actor and the presented assignee', () => {
  expect(assignmentMessage('Bo', undefined, person)).toBe('Bo assigned this to Ada');
  expect(assignmentMessage('Bo', agent, null)).toBe(`Bo unassigned ${issueAgentAssignee.name}`);
  expect(assignmentMessage('Bo', undefined, null)).toBe('Bo unassigned this');
  expect(assignmentMessage('Bo', person, null)).toBe('Bo unassigned Ada');
});
