import type { Icon } from '@groam/icons';
import { CircleDot, GitBranch, Map as MapIcon, MessageSquare } from '@groam/icons';
import { chatHref } from '@/features/discussions/chat/chat-href';
import {
  defaultTripSection,
  tripSectionConfig,
  tripTabSections
} from '@/features/trips/trip-sections';
import type { TripTabSection } from '@/types/trips';

// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
export type CommandPaletteSource<Idea extends { id: string; title: string }> = {
  /** The shared trip the palette is about, or null off a trip. `reference` is how links write it. */
  current: { id: string; reference: string } | null;
  discussions: Array<{ id: string; title: string; tripId?: string | null }>;
  /** This trip's ideas. */
  ideas: Idea[];
  /** This trip's issues. */
  issues: Array<{ id: string; title: string }>;
  /** The trip section on screen: left out of Go to, and kept when switching trips. */
  section: TripTabSection | null;
  trips: Array<{ id: string; name: string; shortId?: string | null }>;
};

/** Browse order: off a trip "Trips" leads the chats; on one "Switch to" closes the list. */
const commandPaletteGroups = ['Go to', 'Ideas', 'Issues', 'Trips', 'Chats', 'Switch to'] as const;

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
  icon: Icon;
  id: string;
  kind: string;
  label: string;
};

// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
type Candidate = Omit<CommandPaletteMatch, 'highlight'> & {
  /** Breaks ties between equal scores before the alphabet does; lower leads. */
  priority?: number;
};
// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
type Scored = Candidate & { highlight?: [number, number]; score: number };

const BROWSE_LIMIT = 4;
const SEARCH_LIMIT = 6;
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

/**
 * Ranked, grouped palette results. Groups stay contiguous; within a group, label
 * matches beat detail matches (exact, prefix, word start, substring), then ties
 * keep their priority (sections in reading order, this trip's chats first) and
 * sort alphabetically. While searching, the group holding the best match leads.
 */
export function buildCommandPaletteMatches<Idea extends { id: string; title: string }>(
  query: string,
  source: CommandPaletteSource<Idea>,
  hrefs: { ideaHref: (idea: Idea) => CommandPaletteMatch['href'] }
): CommandPaletteMatch[] {
  const needle = query.trim().toLowerCase();
  const candidates = commandPaletteCandidates(source, hrefs);
  const sections = commandPaletteGroups.flatMap((group, order) => {
    const scored = candidates
      .filter((candidate) => candidate.group === group)
      .flatMap((candidate) => scoreCandidate(candidate, needle));
    // Browsing a trip lists every section it is not already on; the rest stay capped.
    const limit = needle ? SEARCH_LIMIT : group === 'Go to' ? Infinity : BROWSE_LIMIT;
    const items = scored.sort(compareScored).slice(0, limit);
    if (items.length === 0) return [];
    return [{ best: Math.min(...items.map((item) => item.score)), items, order }];
  });
  if (needle) sections.sort((a, b) => a.best - b.best || a.order - b.order);
  return sections.flatMap((section) =>
    section.items.map(({ priority: _priority, score: _score, ...item }) => item)
  );
}

function compareScored(a: Scored, b: Scored) {
  return (
    a.score - b.score || (a.priority ?? 0) - (b.priority ?? 0) || collator.compare(a.label, b.label)
  );
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

function commandPaletteCandidates<Idea extends { id: string; title: string }>(
  { current, discussions, ideas, issues, section, trips }: CommandPaletteSource<Idea>,
  { ideaHref }: { ideaHref: (idea: Idea) => CommandPaletteMatch['href'] }
): Candidate[] {
  return [
    ...(current
      ? tripTabSections
          .map((tab, priority) => ({ priority, tab }))
          .filter(({ tab }) => tab !== section)
          .map(({ priority, tab }) => ({
            group: 'Go to' as const,
            href: {
              params: { section: tab, tripId: current.reference },
              to: '/trips/$tripId/$section'
            },
            icon: tripSectionConfig[tab].icon,
            id: `section:${tab}`,
            kind: 'Section',
            label: tripSectionConfig[tab].label,
            priority
          }))
      : []),
    ...ideas.map((idea) => ({
      group: 'Ideas' as const,
      href: ideaHref(idea),
      icon: GitBranch,
      id: `idea:${idea.id}`,
      kind: 'Idea',
      label: idea.title
    })),
    ...issues.map((issue) => ({
      group: 'Issues' as const,
      href: { params: { issueId: issue.id }, to: '/issues/$issueId' },
      icon: CircleDot,
      id: `issue:${issue.id}`,
      kind: 'Issue',
      label: issue.title
    })),
    ...discussions.map((discussion) => ({
      group: 'Chats' as const,
      href: chatHref({ discussionId: discussion.id, tripId: discussion.tripId }),
      icon: MessageSquare,
      id: `chat:${discussion.id}`,
      kind: 'Chat',
      label: discussion.title,
      priority: current && discussion.tripId === current.id ? 0 : 1
    })),
    ...trips
      .filter((trip) => trip.id !== current?.id)
      .map((trip) => ({
        group: current ? ('Switch to' as const) : ('Trips' as const),
        href: {
          params: { section: section ?? defaultTripSection, tripId: trip.shortId ?? trip.id },
          to: '/trips/$tripId/$section'
        },
        icon: MapIcon,
        id: `trip:${trip.id}`,
        kind: 'Trip',
        label: trip.name
      }))
  ];
}
