import { Flag, Info, UserRound, Vote } from '@groam/icons';
import {
  listSearchPersonSlugs,
  type ListSearchFacet,
  type ParsedListSearch
} from '@groam/ui/components/list';
import { ideaStatusCopy } from '@/features/ideas/idea-glossary';
import {
  issueAssignees,
  issueFacets,
  issueFilterKeys,
  matchesIssueFilters
} from '@/features/trip-queue/queue-issue-filters';
import type { QueueItem, QueueKind } from '@/types/queue';

const turnFacet: ListSearchFacet = {
  description: 'Whose turn it is',
  icon: Flag,
  key: 'is',
  label: 'Turn',
  values: [
    { description: 'Waiting on you', value: 'your-turn' },
    { description: 'Still open', value: 'active' },
    { description: 'Finished', value: 'settled' }
  ]
};

/** Feature-owned filter definitions; List.Search supplies the shared interaction and rendering. */
export function queueSearchFilters(kind: QueueKind, items: readonly QueueItem[]) {
  const people =
    kind === 'issue'
      ? issueAssignees(items)
      : [
          ...new Map(
            items.flatMap((item) =>
              item.kind === 'idea' && item.authorKey && item.person
                ? [[item.authorKey, { key: item.authorKey, name: item.person.name }] as const]
                : []
            )
          ).values()
        ];
  const slugs: ReadonlyMap<string, string> = listSearchPersonSlugs(people);
  const facets: ListSearchFacet[] =
    kind === 'issue'
      ? issueFacets(people)
      : kind === 'idea'
        ? [
            {
              description: 'Where the idea stands',
              examples: ['in_review', 'draft'],
              icon: Info,
              key: 'status',
              label: 'Status',
              values: Object.entries(ideaStatusCopy).map(([value, description]) => ({
                value,
                description
              }))
            },
            {
              description: 'Who started the idea',
              icon: UserRound,
              key: 'author',
              label: 'Author',
              values: [
                { description: 'Your ideas', value: 'me' },
                ...[...slugs].map(([value, key]) => ({
                  value,
                  description: `Started by ${people.find((person) => person.key === key)?.name ?? 'a member'}`
                }))
              ]
            },
            turnFacet
          ]
        : [
            {
              description: 'Whether voting is open',
              icon: Vote,
              key: 'status',
              label: 'Status',
              values: [{ value: 'open' }, { value: 'closed' }]
            },
            turnFacet
          ];
  return {
    facets,
    keys: kind === 'issue' ? issueFilterKeys : facets.map((facet) => facet.key),
    slugs
  };
}

/** Whether an item passes the parsed `key:value` filters of its own kind's queue. */
export function matchesQueueFilters(
  item: QueueItem,
  parsed: ParsedListSearch,
  slugs: ReadonlyMap<string, string>
) {
  if (item.kind === 'issue') return matchesIssueFilters(item, parsed, slugs);
  const { filters } = parsed;
  if (
    filters.status &&
    !filters.status.some((status) =>
      item.kind === 'idea'
        ? item.ideaStatus === status
        : item.kind === 'poll' && item.poll.status === status
    )
  )
    return false;
  if (
    filters.author &&
    !filters.author.some((author) =>
      author === 'me'
        ? item.person?.mine
        : item.authorKey !== undefined && slugs.get(author) === item.authorKey
    )
  )
    return false;
  return (
    !filters.is ||
    filters.is.some((flag) =>
      flag === 'your-turn'
        ? item.yourTurn
        : flag === 'active'
          ? !item.settled
          : flag === 'settled' && item.settled
    )
  );
}
