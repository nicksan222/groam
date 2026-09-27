import { ids } from './ids';
import { type UiTarget, ui } from './interaction';
import { by, named } from './locators';

export type TripStatusFilter = 'active' | 'all' | 'archived';

export async function filterTripsByStatus(
  target: UiTarget,
  status: TripStatusFilter
): Promise<void> {
  const user = ui(target);
  await user.click(by(user.page, ids.tripStatusFilter));
  await user.click(named(user.page, ids.tripStatusOption, 'data-status', status));
}
