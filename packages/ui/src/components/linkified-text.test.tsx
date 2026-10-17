import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { LinkifiedText, splitLinks } from './linkified-text';

test('splits http and www URLs out of surrounding text', () => {
  expect(splitLinks('See https://a.example/x?y=1 and www.b.example.')).toEqual([
    { kind: 'text', value: 'See ' },
    { href: 'https://a.example/x?y=1', kind: 'link', value: 'https://a.example/x?y=1' },
    { kind: 'text', value: ' and ' },
    { href: 'https://www.b.example', kind: 'link', value: 'www.b.example' },
    { kind: 'text', value: '.' }
  ]);
});

test('keeps balanced parentheses but drops a wrapping one', () => {
  expect(splitLinks('(https://en.wikipedia.org/wiki/Lisbon_(city))')[1]).toMatchObject({
    value: 'https://en.wikipedia.org/wiki/Lisbon_(city)'
  });
  expect(splitLinks('(see https://a.example/x)')[1]).toMatchObject({
    value: 'https://a.example/x'
  });
});

test('leaves text without URLs untouched', () => {
  expect(splitLinks('no links here')).toEqual([{ kind: 'text', value: 'no links here' }]);
});

test('renders URLs as external links', async () => {
  await render(
    <p>
      <LinkifiedText text="Book at https://hotel.example now" />
    </p>
  );
  const link = page.getByRole('link', { name: 'https://hotel.example' }).element();
  expect(link.getAttribute('href')).toBe('https://hotel.example');
  expect(link.getAttribute('target')).toBe('_blank');
  expect(link.getAttribute('rel')).toBe('noopener noreferrer');
});
