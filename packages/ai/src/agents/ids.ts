/**
 * Declared assistant roster: agent ids and assignable targets.
 *
 * These primitives are declared rather than derived because the agent
 * catalog and the tool specs derive from each other through them —
 * TypeScript cannot infer mutually-derived maps, so the loop is cut here.
 * To add an agent: extend `AssistantAgentId` (plus `AgentAssignableTarget`
 * for standalone agents), add its definition file, and list it in
 * `assistantAgents`. The catalog map must satisfy this roster or compilation
 * fails.
 */
export type AssistantAgentId = 'groam' | 'issue' | 'reviewer';

export type AgentAssignableTarget = 'issue' | 'proposal';
