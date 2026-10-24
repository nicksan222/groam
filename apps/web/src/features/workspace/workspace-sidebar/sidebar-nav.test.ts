import { expect, test } from 'vite-plus/test';
import { navigationItemIsActive, pageTitle } from './sidebar-nav';

test('navigationItemIsActive treats home as an exact match', () => {
  expect(navigationItemIsActive('/', '/')).toBe(true);
  expect(navigationItemIsActive('/trips', '/')).toBe(false);
});

test('navigationItemIsActive matches nested routes for non-home items', () => {
  expect(navigationItemIsActive('/trips', '/trips')).toBe(true);
  expect(navigationItemIsActive('/trips/abc', '/trips')).toBe(true);
  expect(navigationItemIsActive('/chat', '/trips')).toBe(false);
});

test.each([
  ['/', 'Home'],
  ['/inbox', 'Inbox'],
  ['/settings/profile', 'Settings'],
  ['/chat/thread-1', 'Chat'],
  ['/trips', 'Trips'],
  ['/somewhere-else', 'Groam']
])('pageTitle names %s as %s', (pathname, title) => {
  expect(pageTitle(pathname)).toBe(title);
});
