import type { IdeaCloneView } from '@/types/ideas';

export const ideaCloneViews = ['compare', 'itinerary', 'overview'] as const;

export type { IdeaCloneView };

export const defaultIdeaCloneView: IdeaCloneView = 'overview';

export function isIdeaCloneView(value: string): value is IdeaCloneView {
  return ideaCloneViews.some((view) => view === value);
}
