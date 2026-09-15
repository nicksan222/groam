import { expect, test } from 'vitest';
import { isChatThreadRoute, navigationItemIsActive } from './sidebar-nav';

test('navigationItemIsActive treats home as an exact match', () => {
  expect(navigationItemIsActive('/', '/')).toBe(true);
  expect(navigationItemIsActive('/trips', '/')).toBe(false);
});

test('navigationItemIsActive matches nested routes for non-home items', () => {
  expect(navigationItemIsActive('/trips', '/trips')).toBe(true);
  expect(navigationItemIsActive('/trips/abc', '/trips')).toBe(true);
  expect(navigationItemIsActive('/chat', '/trips')).toBe(false);
});

test('isChatThreadRoute detects open chat threads only', () => {
  expect(isChatThreadRoute('/chat/thread-a')).toBe(true);
  expect(isChatThreadRoute('/chat')).toBe(false);
  expect(isChatThreadRoute('/chat/')).toBe(false);
});
