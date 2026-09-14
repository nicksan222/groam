import { describe, expect, test } from 'vitest';
import { isSettingsSection, visibleSettingsSections } from './settings-sections';

describe('visibleSettingsSections', () => {
  test('hides Data on the hosted web shell', () => {
    expect(visibleSettingsSections(false)).not.toContain('data');
    expect(isSettingsSection('data', false)).toBe(false);
  });

  test('shows Data in the packaged desktop app', () => {
    expect(visibleSettingsSections(true, true)).toContain('data');
    expect(isSettingsSection('data', true, true)).toBe(true);
  });

  test('hides Data in desktop debug sessions', () => {
    expect(visibleSettingsSections(true, false)).not.toContain('data');
    expect(isSettingsSection('data', true, false)).toBe(false);
  });
});
