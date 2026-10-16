import { ids } from '#src/testing/ids';
import { type UiTarget, ui } from './interaction';
import { by } from './locators';

export type TripSection = 'activity' | 'board' | 'ideas' | 'issues' | 'itinerary' | 'overview';

export async function openTripSection(target: UiTarget, section: TripSection): Promise<void> {
  const user = ui(target);
  const sectionIds = {
    activity: ids.tripSectionActivity,
    board: ids.tripSectionBoard,
    ideas: ids.tripSectionIdeas,
    issues: ids.tripSectionIssues,
    itinerary: ids.tripSectionItinerary,
    overview: ids.tripSectionOverview
  } as const;
  const selected = by(user.page, sectionIds[section]);
  if (section === 'itinerary' && !(await selected.isVisible())) {
    await user.click(by(user.page, ids.tripSectionOverview));
    return;
  }
  await user.click(selected);
}
