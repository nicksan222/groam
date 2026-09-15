import type { SidebarFavoriteItem } from '@/types/workspace';

/** Shared chrome for ChatGPT-style nested trip/chat lists in the workspace sidebar. */
export const SIDEBAR_NESTED_PAGE_SIZE = 5;

export type { SidebarFavoriteItem };

/** Keep favourites pinned above recency-sorted items in sidebar lists. */
export function orderSidebarItems<T extends SidebarFavoriteItem>(items: T[]): T[] {
  return items.toSorted(
    (left, right) =>
      Number(Boolean(right.favorite)) - Number(Boolean(left.favorite)) ||
      right.lastUpdatedAt - left.lastUpdatedAt
  );
}
