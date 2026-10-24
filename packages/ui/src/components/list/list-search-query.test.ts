import { expect, test } from 'vite-plus/test';
import {
  applyListSearchSuggestion,
  listSearchPersonSlugs,
  listSearchSlug,
  listSearchSuggestions,
  parseListSearch,
  segmentListSearch,
  tokenizeListSearch
} from './list-search-query';

const facets = [
  { description: 'Who holds it', key: 'assignee', values: [{ value: 'me' }, { value: 'sam' }] },
  { description: 'Flags', key: 'is', values: [{ value: 'mandatory' }] }
];

test('parses known key:value words and keeps the rest as text', () => {
  expect(
    parseListSearch('book Assignee:Me is:mandatory flights nope:x assignee:', ['assignee', 'is'])
  ).toEqual({
    filters: { assignee: ['me'], is: ['mandatory'] },
    text: 'book flights nope:x'
  });
  expect(parseListSearch('assignee:me assignee:sam', ['assignee']).filters).toEqual({
    assignee: ['me', 'sam']
  });
  expect(parseListSearch('assignee:me', []).text).toBe('assignee:me');
});

test('a trailing bare key is neither a filter nor free text', () => {
  expect(parseListSearch('flights assignee:', ['assignee'])).toEqual({
    filters: {},
    text: 'flights'
  });
  expect(tokenizeListSearch('assignee:', ['assignee'])).toEqual([
    { key: 'assignee', kind: 'key', raw: 'assignee:' }
  ]);
});

test('slugs names into one word without accents', () => {
  expect(listSearchSlug(' Sam Lee ')).toBe('sam-lee');
  expect(listSearchSlug('Ana Martínez')).toBe('ana-martinez');
  expect(listSearchSlug('Zoë Åberg')).toBe('zoe-aberg');
});

test('segments keep the spaces between words so the input can be mirrored verbatim', () => {
  const query = ' beach  assignee:me  assignee: ';
  const segments = segmentListSearch(query, ['assignee']);
  expect(segments.map((segment) => segment.raw).join('')).toBe(query);
  expect(segments.map((segment) => segment.kind)).toEqual([
    'space',
    'text',
    'space',
    'filter',
    'space',
    'key',
    'space'
  ]);
});

test('an empty query offers complete example filters under one group', () => {
  const found = listSearchSuggestions('  ', facets);
  expect(found.map((s) => s.label)).toEqual(['assignee:me', 'assignee:sam', 'is:mandatory']);
  expect(new Set(found.map((s) => s.group))).toEqual(new Set(['Filters']));
  expect(listSearchSuggestions('as', facets).map((s) => s.group)).toEqual(['Filters']);
  const declared = listSearchSuggestions('', [{ ...facets[0]!, examples: ['sam'] }]);
  expect(declared.map((s) => s.label)).toEqual(['assignee:sam']);
});

test('tokenizes recognised filters apart from free text', () => {
  expect(tokenizeListSearch('beach Assignee:Me nope:x', ['assignee'])).toEqual([
    { kind: 'text', raw: 'beach' },
    { key: 'assignee', kind: 'filter', raw: 'Assignee:Me', value: 'me' },
    { kind: 'text', raw: 'nope:x' }
  ]);
});

test('suggests keys while typing a word and values after the colon', () => {
  expect(listSearchSuggestions('beach as', facets).map((s) => s.label)).toEqual(['assignee:']);
  expect(listSearchSuggestions('assignee:s', facets).map((s) => s.label)).toEqual(['assignee:sam']);
  expect(listSearchSuggestions('assignee:s', facets).map((s) => s.group)).toEqual(['Assignee']);
  expect(
    listSearchSuggestions('assignee:s', [{ ...facets[0]!, label: 'Holder' }]).map((s) => s.group)
  ).toEqual(['Holder']);
  expect(listSearchSuggestions('nope:', facets)).toEqual([]);
  expect(listSearchSuggestions('beach ', facets)).toEqual([]);
  expect(listSearchSuggestions('beach zz', facets)).toEqual([]);
});

test('a single letter offers no keys, two do', () => {
  expect(listSearchSuggestions('beach a', facets)).toEqual([]);
  expect(listSearchSuggestions('i', facets)).toEqual([]);
  expect(listSearchSuggestions('is', facets).map((s) => s.label)).toEqual(['is:']);
});

test('a suggestion replaces only the word being typed', () => {
  const [key] = listSearchSuggestions('beach as', facets);
  expect(applyListSearchSuggestion('beach as', key!)).toBe('beach assignee:');
  const [value] = listSearchSuggestions('beach assignee:s', facets);
  expect(applyListSearchSuggestion('beach assignee:s', value!)).toBe('beach assignee:sam ');
});

test('person filters disambiguate duplicate and reserved names independently of input order', () => {
  const people = [
    { key: 'b', name: 'Sam Lee' },
    { key: 'a', name: 'Sam Lee' },
    { key: 'c', name: 'me' },
    { key: 'd', name: 'Sam Lee-2' }
  ];
  const slugs = listSearchPersonSlugs(people);
  expect(slugs).toEqual(listSearchPersonSlugs([...people].reverse()));
  expect(new Set(slugs.values()).size).toBe(4);
  expect(slugs.get('sam-lee')).toBe('a');
  expect(slugs.get('sam-lee-2')).toBe('b');
  expect(slugs.get('me-2')).toBe('c');
  expect(slugs.has('me')).toBe(false);
});
