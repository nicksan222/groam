import type { SettingsSection } from '@/types/settings';

export const settingsSections = ['profile', 'appearance', 'group', 'security', 'ai'] as const;

export type { SettingsSection };

export const defaultSettingsSection: SettingsSection = 'profile';

export function isSettingsSection(value: string): value is SettingsSection {
  return settingsSections.some((section) => section === value);
}
