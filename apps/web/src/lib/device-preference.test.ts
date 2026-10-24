import { afterEach, describe, expect, test, vi } from 'vite-plus/test';
import {
  clearDevicePreference,
  readDevicePreference,
  writeDevicePreference
} from './device-preference';

function fakeStorage(overrides: Partial<Storage> = {}) {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    removeItem: (key: string) => void data.delete(key),
    setItem: (key: string, value: string) => void data.set(key, value),
    ...overrides
  } as Storage;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('device preferences', () => {
  test('round-trips and clears a value', () => {
    vi.stubGlobal('window', { localStorage: fakeStorage() });
    expect(readDevicePreference('k')).toBeNull();
    writeDevicePreference('k', 'v');
    expect(readDevicePreference('k')).toBe('v');
    clearDevicePreference('k');
    expect(readDevicePreference('k')).toBeNull();
  });

  test('does nothing without a window', () => {
    vi.stubGlobal('window', undefined);
    expect(readDevicePreference('k')).toBeNull();
    expect(() => writeDevicePreference('k', 'v')).not.toThrow();
    expect(() => clearDevicePreference('k')).not.toThrow();
  });

  test('swallows storage failures', () => {
    const deny = () => {
      throw new Error('denied');
    };
    vi.stubGlobal('window', {
      localStorage: fakeStorage({ getItem: deny, removeItem: deny, setItem: deny })
    });
    expect(readDevicePreference('k')).toBeNull();
    expect(() => writeDevicePreference('k', 'v')).not.toThrow();
    expect(() => clearDevicePreference('k')).not.toThrow();
  });

  test('survives a blocked storage getter', () => {
    vi.stubGlobal('window', {
      get localStorage(): Storage {
        throw new Error('SecurityError');
      }
    });
    expect(readDevicePreference('k')).toBeNull();
  });
});
