import { expect, test } from 'vite-plus/test';
import { italianMessages, runtimeCommon } from '@/i18n/catalog';
import { formatMessage } from '@/i18n/format';
import { localizedPath, localeFromPath, withoutLocale } from '@/i18n/locale';

test('language links preserve destinations, queries, and anchors', () => {
  expect(localizedPath('/features/ai/?from=home#research', 'it')).toBe(
    '/it/features/ai/?from=home#research'
  );
  expect(localizedPath('/it/features/ai/?from=home#research', 'en')).toBe(
    '/features/ai/?from=home#research'
  );
  expect(localizedPath('/404.html', 'it')).toBe('/it/404/');
  expect(localizedPath('/it/404/', 'en')).toBe('/404.html');
  for (const path of [
    '#research',
    'https://app.groam.io/',
    '//example.com/',
    '/images/trip.svg',
    '/itinerary/'
  ]) {
    expect(localizedPath(path, 'it')).toBe(path);
  }
  expect(localeFromPath('/it/features/')).toBe('it');
  expect(localeFromPath('/itinerary/')).toBe('en');
  expect(withoutLocale('/it/')).toBe('/');
});

test('translated placeholders preserve changing amounts and names', () => {
  expect(formatMessage('You pay €2. 3 travelers pay their own.', italianMessages)).toBe(
    formatMessage('You pay €{covered}. {count} travelers pay their own.', italianMessages, {
      covered: 2,
      count: 3
    })
  );
  expect(
    formatMessage('Hello {name}.', { 'Hello {name}.': 'Ciao {name}.' }, { name: 'Maya' })
  ).toBe('Ciao Maya.');
  expect(formatMessage('A+B (2).', { 'A+B ({count}).': 'Totale {count}.' })).toBe('Totale 2.');
  expect(formatMessage('An unmatched sentence', italianMessages)).toBe('An unmatched sentence');
});

test('every Italian message preserves its interpolation contract', () => {
  const placeholders = (text: string) =>
    [...text.matchAll(/\{(\w+)\}/gu)].map((match) => match[1]).sort();
  for (const [source, translation] of Object.entries(italianMessages)) {
    expect(translation.trim()).not.toBe('');
    expect({ source, placeholders: placeholders(translation) }).toEqual({
      source,
      placeholders: placeholders(source)
    });
  }
  for (const [source, translation] of Object.entries(runtimeCommon)) {
    expect(translation).toBe(italianMessages[source]);
  }
});
