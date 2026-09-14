import { env } from '@groam/env/web-client';
import type { SettingsSection } from '@/types/settings';

export const settingsSections = [
  'profile',
  'appearance',
  'group',
  'security',
  'ai',
  'data'
] as const;

export type { SettingsSection };

export const defaultSettingsSection: SettingsSection = 'profile';

export function visibleSettingsSections(
  isDesktop = env.isDesktop,
  packaged = env.mode === 'production'
): readonly SettingsSection[] {
  return settingsSections.filter((section) => section !== 'data' || (isDesktop && packaged));
}

export function isSettingsSection(
  value: string,
  isDesktop = env.isDesktop,
  packaged = env.mode === 'production'
): value is SettingsSection {
  return visibleSettingsSections(isDesktop, packaged).some((section) => section === value);
}
