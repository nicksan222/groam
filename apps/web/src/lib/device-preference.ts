/** Small string preferences remembered on this device; storage failures never throw. */
function attempt<Value>(action: (storage: Storage) => Value, fallback: Value): Value {
  try {
    // oxlint-disable-next-line groam/no-direct-web-storage -- this module is the shared storage adapter
    return typeof window === 'undefined' ? fallback : action(window.localStorage);
  } catch {
    // Private mode, blocked storage, or a full quota only means nothing is remembered.
    return fallback;
  }
}

export function readDevicePreference(key: string): string | null {
  return attempt((storage) => storage.getItem(key), null);
}

export function writeDevicePreference(key: string, value: string): void {
  attempt((storage) => storage.setItem(key, value), undefined);
}

export function clearDevicePreference(key: string): void {
  attempt((storage) => storage.removeItem(key), undefined);
}
