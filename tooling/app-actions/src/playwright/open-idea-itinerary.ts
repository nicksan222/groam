import { ids } from './ids';
import { type UiTarget, ui } from './interaction';
import { by } from './locators';

export async function openIdeaItinerary(target: UiTarget): Promise<void> {
  const user = ui(target);
  await user.click(by(user.page, ids.tripSectionItinerary));
}
