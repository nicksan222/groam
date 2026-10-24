import { expect, test, vi } from 'vite-plus/test';
import { reloadOnStaleChunk } from './reload-on-stale-chunk';

function setup(initial?: string) {
  const values = new Map<string, string>(initial ? [['groam:stale-chunk-reload', initial]] : []);
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value)
  } as Storage;
  const reload = vi.fn();
  const event = new Event('vite:preloadError', { cancelable: true });
  return { storage, reload, event };
}

test('reloads once when a chunk fails to load', () => {
  const { storage, reload, event } = setup();
  expect(reloadOnStaleChunk(event, { storage, reload, now: () => 1_000_000 })).toBe(true);
  expect(reload).toHaveBeenCalledOnce();
  expect(event.defaultPrevented).toBe(true);
});

test('does not reload again right after a reload', () => {
  const { storage, reload, event } = setup('1000000');
  expect(reloadOnStaleChunk(event, { storage, reload, now: () => 1_030_000 })).toBe(false);
  expect(reload).not.toHaveBeenCalled();
  expect(event.defaultPrevented).toBe(false);
});

test('reloads again for a later release', () => {
  const { storage, reload, event } = setup('1000000');
  expect(reloadOnStaleChunk(event, { storage, reload, now: () => 1_100_000 })).toBe(true);
  expect(reload).toHaveBeenCalledOnce();
});
