import type { IdeaCloneSearch } from '@/types/ideas';

export type { IdeaCloneSearch };

export function parseIdeaCloneSearch(search: Record<string, unknown>): IdeaCloneSearch {
  return search.addDestination === true ? { addDestination: true } : {};
}
