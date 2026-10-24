import { expect, test } from 'vite-plus/test';
import { authSiteLink } from './site';

test('site links stay under the path the frontend is hosted at', () => {
  expect(authSiteLink('/settings/profile?x=1', 'https://groam.app/app')).toBe(
    'https://groam.app/app/settings/profile?x=1'
  );
  expect(authSiteLink('settings/profile', 'https://groam.app/app/')).toBe(
    'https://groam.app/app/settings/profile'
  );
  expect(authSiteLink('/settings/profile', 'http://localhost:5173')).toBe(
    'http://localhost:5173/settings/profile'
  );
});
