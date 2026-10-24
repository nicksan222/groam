import type { IdeaCloneView, IdeaPlanningSection } from '@/types/ideas';

export const ideaCloneViews = ['calendar', 'compare', 'itinerary', 'overview', 'packing'] as const;

export type { IdeaCloneView };

export const defaultIdeaCloneView: IdeaCloneView = 'overview';

export function isIdeaCloneView(value: string): value is IdeaCloneView {
  return ideaCloneViews.some((view) => view === value);
}

/** How an idea's planning views are titled where a page or the assistant names them. */
export const ideaViewTitles = {
  calendar: 'Calendar',
  itinerary: 'Itinerary',
  overview: 'Overview',
  packing: 'Packing'
} as const satisfies Record<IdeaPlanningSection, string>;

/** The planning view an idea tab shows; Compare sits beside them, over the Overview. */
export function ideaPlanningSection(view: IdeaCloneView): IdeaPlanningSection {
  return view === 'itinerary' || view === 'packing' || view === 'calendar' ? view : 'overview';
}

/** What Groam AI is told the idea page shows. */
export function ideaAgentView(view: IdeaCloneView): IdeaPlanningSection | 'idea-compare' {
  return view === 'compare' ? 'idea-compare' : ideaPlanningSection(view);
}
