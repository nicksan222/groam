import { expect, test } from 'vite-plus/test';
import { absoluteHref, routerBasepath } from '@/lib/navigation/base-path';

test('the router basepath drops the trailing slash and is empty at the root', () => {
  expect(routerBasepath('/')).toBe('');
  expect(routerBasepath('/app/')).toBe('/app');
  expect(routerBasepath('/app')).toBe('/app');
});

test('absolute links keep the hosted base path', () => {
  const origin = 'https://groam.example';
  expect(absoluteHref('/issues/abc', { base: '/app/', origin })).toBe(
    'https://groam.example/app/issues/abc'
  );
  expect(absoluteHref('/issues/abc', { base: '/', origin })).toBe(
    'https://groam.example/issues/abc'
  );
});
