import { ids } from './ids';
import { type UiTarget, ui } from './interaction';
import { by } from './locators';

export async function selectSystemTheme(target: UiTarget): Promise<void> {
  const user = ui(target);
  await user.click(by(user.page, ids.mobileNavMore));
  await user.click(by(user.page, ids.navSettings));
  await user.click(by(user.page, ids.settingsSectionAppearance));
  await user.click(by(user.page, ids.themeSystem));
}
