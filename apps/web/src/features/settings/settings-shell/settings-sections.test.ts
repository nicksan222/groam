import { describe, expect, test } from 'vite-plus/test';
import { isSettingsSection, settingsSections } from './settings-sections';

describe('isSettingsSection', () => {
  test('accepts every listed section', () => {
    for (const section of settingsSections) expect(isSettingsSection(section)).toBe(true);
  });

  test('rejects unknown sections', () => {
    expect(isSettingsSection('data')).toBe(false);
  });
});
