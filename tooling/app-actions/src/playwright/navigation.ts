import { expect, type Page } from '@playwright/test';
import { ids } from './ids';
import { by } from './locators';

export async function openSettingsGroupSection(page: Page): Promise<void> {
  await by(page, ids.navSettings).click();
  await expect(by(page, ids.settingsTitle)).toBeVisible();
  await by(page, ids.settingsSectionGroup).click();
}

export async function openSettingsSecuritySection(page: Page): Promise<void> {
  await by(page, ids.navSettings).click();
  await expect(by(page, ids.settingsTitle)).toBeVisible();
  await by(page, ids.settingsSectionSecurity).click();
  await expect(page).toHaveURL(/\/settings\/security\/?$/u);
}
