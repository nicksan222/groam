import type { LucideIcon } from 'lucide-react';
import { Bot, CircleDot, GitBranch, Map as MapIcon, MessageSquare } from 'lucide-react';

// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
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

const commandPaletteGroups = ['Trips', 'Ideas', 'Issues', 'Chats', 'Agents'] as const;

// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
export type CommandPaletteGroup = (typeof commandPaletteGroups)[number];

// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
export type CommandPaletteMatch = {
  detail?: string;
  group: CommandPaletteGroup;
  /** Matched `[start, end)` range inside `label`, when the label itself matched. */
  highlight?: [number, number];
  href:
    | { params: Record<string, string>; to: string }
    | { params: Record<string, string>; search?: Record<string, unknown>; to: string }
    | { to: string };
  icon: LucideIcon;
  id: string;
  kind: string;
  label: string;
};

// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
type Candidate = Omit<CommandPaletteMatch, 'highlight'> & { pinned?: boolean };
// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
type Scored = CommandPaletteMatch & { pinned?: boolean; score: number };

const BROWSE_LIMIT = 4;
const SEARCH_LIMIT = 6;
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

/**
 * Ranked, grouped palette results. Groups stay contiguous; within a group, label
 * matches beat detail matches (exact, prefix, word start, substring), then names
 * sort alphabetically. While searching, the group holding the best match leads.
 */
export function buildCommandPaletteMatches(
  query: string,
  source: CommandPaletteSource,
  hrefs: {
    agentHref: (agentId: string, runId?: string) => { params: Record<string, string>; to: string };
    ideaHref: (idea: { id: string; sourceTripId: string }) => {
      params: Record<string, string>;
      search?: Record<string, unknown>;
      to: string;
    };
  }
): CommandPaletteMatch[] {
  const needle = query.trim().toLowerCase();
  const limit = needle ? SEARCH_LIMIT : BROWSE_LIMIT;
  const candidates = commandPaletteCandidates(source, hrefs);
  const sections = commandPaletteGroups.flatMap((group, order) => {
    const scored = candidates
      .filter((candidate) => candidate.group === group)
      .flatMap((candidate) => scoreCandidate(candidate, needle));
    const ranked = scored
      .filter((item) => !item.pinned)
      .sort(compareScored)
      .slice(0, limit);
    const items = [...ranked, ...scored.filter((item) => item.pinned)];
    if (items.length === 0) return [];
    return [{ best: Math.min(...items.map((item) => item.score)), items, order }];
  });
  if (needle) sections.sort((a, b) => a.best - b.best || a.order - b.order);
  return sections.flatMap((section) =>
    section.items.map(({ pinned: _pinned, score: _score, ...item }) => item)
  );
}

function compareScored(a: Scored, b: Scored) {
  return a.score - b.score || collator.compare(a.label, b.label);
}

function scoreCandidate(candidate: Candidate, needle: string): Scored[] {
  if (!needle) return [{ ...candidate, score: 0 }];
  const label = candidate.label.toLowerCase();
  const index = label.indexOf(needle);
  if (index >= 0) {
    return [
      {
        ...candidate,
        highlight: [index, index + needle.length],
        score: labelScore(label, needle, index)
      }
    ];
  }
  return candidate.detail?.toLowerCase().includes(needle) ? [{ ...candidate, score: 4 }] : [];
}

function labelScore(label: string, needle: string, index: number) {
  if (label === needle) return 0;
  if (index === 0) return 1;
  return /[\p{L}\p{N}]/u.test(label[index - 1] ?? '') ? 3 : 2;
}

function commandPaletteCandidates(
  source: CommandPaletteSource,
  { agentHref, ideaHref }: Parameters<typeof buildCommandPaletteMatches>[2]
): Candidate[] {
  return [
    ...source.trips.map((trip) => ({
      group: 'Trips' as const,
      href: { params: { section: 'board', tripId: trip.id }, to: '/trips/$tripId/$section' },
      icon: MapIcon,
      id: `trip:${trip.id}`,
      kind: 'Trip',
      label: trip.name
    })),
    ...source.ideas.map((idea) => ({
      detail: idea.sourceTripName,
      group: 'Ideas' as const,
      href: ideaHref({ id: idea.id, sourceTripId: idea.sourceTripId }),
      icon: GitBranch,
      id: `idea:${idea.id}`,
      kind: 'Idea',
      label: idea.title
    })),
    ...source.issues.map((issue) => ({
      detail: issue.tripName,
      group: 'Issues' as const,
      href: { params: { issueId: issue.id }, to: '/issues/$issueId' },
      icon: CircleDot,
      id: `issue:${issue.id}`,
      kind: 'Issue',
      label: issue.title
    })),
    ...source.discussions.map((discussion) => ({
      group: 'Chats' as const,
      href: { params: { discussionId: discussion.id }, to: '/chat/$discussionId' },
      icon: MessageSquare,
      id: `chat:${discussion.id}`,
      kind: 'Chat',
      label: discussion.title
    })),
    ...source.agents.map((agent) => ({
      detail: agent.surface === 'chat' ? 'Chat agent' : 'Worker',
      group: 'Agents' as const,
      href: agent.latestRun
        ? agentHref(agent.id, agent.latestRun.id)
        : { params: { agentId: agent.id }, to: '/agents/$agentId' },
      icon: Bot,
      id: `agent:${agent.id}`,
      kind: agent.surface === 'chat' ? 'Chat agent' : 'Worker',
      label: agent.label
    })),
    {
      group: 'Agents',
      href: { to: '/agents' },
      icon: Bot,
      id: 'agents',
      kind: 'Page',
      label: 'All agents',
      pinned: true
    }
  ];
}
