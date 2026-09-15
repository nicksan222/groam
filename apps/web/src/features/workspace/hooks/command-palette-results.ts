import type { LucideIcon } from 'lucide-react';
import { Bot, FileDiff, Map as MapIcon, MessageSquare } from 'lucide-react';

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
export type CommandPaletteSource = {
  agents: Array<{
    id: string;
    label: string;
    latestRun?: { id: string } | null;
    surface: string;
  }>;
  discussions: Array<{ id: string; title: string }>;
  ideas: Array<{ id: string; sourceTripId: string; sourceTripName: string; title: string }>;
  issues: Array<{ id: string; title: string; tripName: string }>;
  trips: Array<{ id: string; name: string }>;
};

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
export type CommandPaletteMatch = {
  href:
    | { params: Record<string, string>; to: string }
    | { params: Record<string, string>; search?: Record<string, unknown>; to: string }
    | { to: string };
  icon: LucideIcon;
  id: string;
  kind: string;
  label: string;
};

export function buildCommandPaletteMatches(
  query: string,
  source: CommandPaletteSource,
  {
    agentHref,
    ideaHref
  }: {
    agentHref: (agentId: string, runId?: string) => { params: Record<string, string>; to: string };
    ideaHref: (idea: { id: string; sourceTripId: string }) => {
      params: Record<string, string>;
      search?: Record<string, unknown>;
      to: string;
    };
  }
): CommandPaletteMatch[] {
  const needle = query.trim().toLowerCase();
  const match = (value: string) => !needle || value.toLowerCase().includes(needle);
  const items: CommandPaletteMatch[] = [];

  for (const trip of source.trips) {
    if (!match(trip.name)) continue;
    items.push({
      href: {
        params: { section: 'overview', tripId: trip.id },
        to: '/trips/$tripId/$section'
      },
      icon: MapIcon,
      id: `trip:${trip.id}`,
      kind: 'Trip',
      label: trip.name
    });
  }
  for (const idea of source.ideas) {
    if (!(match(idea.title) || match(idea.sourceTripName))) continue;
    items.push({
      href: ideaHref({ id: idea.id, sourceTripId: idea.sourceTripId }),
      icon: FileDiff,
      id: `idea:${idea.id}`,
      kind: 'Idea',
      label: idea.title
    });
  }
  for (const issue of source.issues) {
    if (!(match(issue.title) || match(issue.tripName))) continue;
    items.push({
      href: { params: { issueId: issue.id }, to: '/issues/$issueId' },
      icon: FileDiff,
      id: `issue:${issue.id}`,
      kind: 'Issue',
      label: issue.title
    });
  }
  for (const discussion of source.discussions) {
    if (!match(discussion.title)) continue;
    items.push({
      href: { params: { discussionId: discussion.id }, to: '/chat/$discussionId' },
      icon: MessageSquare,
      id: `chat:${discussion.id}`,
      kind: 'Chat',
      label: discussion.title
    });
  }
  if (match('Agents')) {
    items.push({
      href: { to: '/agents' },
      icon: Bot,
      id: 'agents',
      kind: 'Agents',
      label: 'Agents'
    });
  }
  for (const agent of source.agents) {
    if (!match(agent.label)) continue;
    items.push({
      href: agent.latestRun
        ? agentHref(agent.id, agent.latestRun.id)
        : { params: { agentId: agent.id }, to: '/agents/$agentId' },
      icon: Bot,
      id: `agent:${agent.id}`,
      kind: agent.surface === 'chat' ? 'Chat agent' : 'Worker',
      label: agent.label
    });
  }
  return items.slice(0, 20);
}
