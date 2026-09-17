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
  return commandPaletteItems(source, { agentHref, ideaHref, match }).slice(0, 20);
}

function commandPaletteItems(
  source: CommandPaletteSource,
  options: {
    agentHref: Parameters<typeof buildCommandPaletteMatches>[2]['agentHref'];
    ideaHref: Parameters<typeof buildCommandPaletteMatches>[2]['ideaHref'];
    match: (value: string) => boolean;
  }
): CommandPaletteMatch[] {
  const { agentHref, ideaHref, match } = options;
  return [
    ...source.trips.flatMap((trip) =>
      match(trip.name)
        ? [
            {
              href: {
                params: { section: 'overview', tripId: trip.id },
                to: '/trips/$tripId/$section'
              },
              icon: MapIcon,
              id: `trip:${trip.id}`,
              kind: 'Trip',
              label: trip.name
            }
          ]
        : []
    ),
    ...source.ideas.flatMap((idea) =>
      match(idea.title) || match(idea.sourceTripName)
        ? [
            {
              href: ideaHref({ id: idea.id, sourceTripId: idea.sourceTripId }),
              icon: FileDiff,
              id: `idea:${idea.id}`,
              kind: 'Idea',
              label: idea.title
            }
          ]
        : []
    ),
    ...source.issues.flatMap((issue) =>
      match(issue.title) || match(issue.tripName)
        ? [
            {
              href: { params: { issueId: issue.id }, to: '/issues/$issueId' },
              icon: FileDiff,
              id: `issue:${issue.id}`,
              kind: 'Issue',
              label: issue.title
            }
          ]
        : []
    ),
    ...source.discussions.flatMap((discussion) =>
      match(discussion.title)
        ? [
            {
              href: { params: { discussionId: discussion.id }, to: '/chat/$discussionId' },
              icon: MessageSquare,
              id: `chat:${discussion.id}`,
              kind: 'Chat',
              label: discussion.title
            }
          ]
        : []
    ),
    ...(match('Agents')
      ? [{ href: { to: '/agents' }, icon: Bot, id: 'agents', kind: 'Agents', label: 'Agents' }]
      : []),
    ...source.agents.flatMap((agent) =>
      match(agent.label)
        ? [
            {
              href: agent.latestRun
                ? agentHref(agent.id, agent.latestRun.id)
                : { params: { agentId: agent.id }, to: '/agents/$agentId' },
              icon: Bot,
              id: `agent:${agent.id}`,
              kind: agent.surface === 'chat' ? 'Chat agent' : 'Worker',
              label: agent.label
            }
          ]
        : []
    )
  ];
}
