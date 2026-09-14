import { describe, expect, test } from 'vitest';
import { APP_SHELLS, isAppShell, resolveAppShell } from './app-shell';

describe('resolveAppShell', () => {
  test('treats an explicit desktop value as the Tauri shell', () => {
    expect(resolveAppShell('desktop')).toBe('desktop');
  });

  test.each([undefined, '', 'web', 'cloud', 'WEB', 'Desktop'])(
    'defaults %j to the hosted web shell',
    (value) => {
      expect(resolveAppShell(value)).toBe('web');
    }
  );
});

describe('isAppShell', () => {
  test('accepts only the two product shells', () => {
    expect(APP_SHELLS).toEqual(['web', 'desktop']);
    expect(isAppShell('web')).toBe(true);
    expect(isAppShell('desktop')).toBe(true);
    expect(isAppShell('cloud')).toBe(false);
    expect(isAppShell(undefined)).toBe(false);
  });
});
