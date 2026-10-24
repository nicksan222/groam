import { Flag, UserRound } from '@groam/icons';
import {
  type ListSearchFacet,
  listSearchPersonSlugs as issueAssigneeSlugs,
  type ParsedListSearch
} from '@groam/ui/components/list';
import type { QueueItem } from '@/types/queue';

/** The `key:value` filters an issue search understands. */
export const issueFilterKeys = ['assignee', 'is'] as const;

/** The hints for those filters: who holds the issue, and its flags. */
export function issueFacets(
  assignees: ReadonlyArray<{ key: string; name: string }>
): ListSearchFacet[] {
  const names = new Map(assignees.map(({ key, name }) => [key, name]));
  return [
    {
      description: 'Who holds the issue',
      examples: ['me', 'unassigned'],
      icon: UserRound,
      key: 'assignee',
      label: 'Assignee',
      values: [
        { description: 'Assigned to you', value: 'me' },
        { description: 'Nobody yet', value: 'unassigned' },
        ...[...issueAssigneeSlugs(assignees)].map(([value, key]) => ({
          description: `Assigned to ${names.get(key) ?? 'a member'}`,
          value
        }))
      ]
    },
    {
      description: 'What kind of issue',
      icon: Flag,
      key: 'is',
      label: 'Flag',
      values: [{ description: 'Must be done for the trip', value: 'mandatory' }]
    }
  ];
}

/**
 * Whether an item passes the parsed issue filters; non-issues always pass. Values of one key are
 * any-of, and a value nothing offers matches nothing. `slugs` maps assignee values to people
 * (`issueAssigneeSlugs`).
 */
export function matchesIssueFilters(
  item: QueueItem,
  { filters }: ParsedListSearch,
  slugs: ReadonlyMap<string, string>
) {
  if (item.kind !== 'issue') return true;
  const assignees = filters.assignee;
  if (assignees && !assignees.some((value) => matchesAssignee(item, value, slugs))) return false;
  const flags = filters.is;
  return !flags || flags.every((flag) => flag === 'mandatory' && item.mandatory);
}

function matchesAssignee(item: QueueItem, value: string, slugs: ReadonlyMap<string, string>) {
  if (value === 'me') return item.assignedToViewer === true;
  if (value === 'unassigned') return item.assigneeKey === undefined;
  return item.assigneeKey !== undefined && slugs.get(value) === item.assigneeKey;
}

/** Everyone other than the viewer who holds an issue, by name, for the assignee hints. */
export function issueAssignees(items: readonly QueueItem[]): Array<{ key: string; name: string }> {
  const seen = new Map<string, string>();
  for (const item of items) {
    if (item.kind === 'issue' && item.assigneeKey && !item.assignedToViewer && item.person) {
      seen.set(item.assigneeKey, item.person.name);
    }
  }
  return [...seen]
    .map(([key, name]) => ({ key, name }))
    .toSorted((left, right) => left.name.localeCompare(right.name));
}
