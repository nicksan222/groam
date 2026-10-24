import type { Icon } from '@groam/icons';

/** One `key:value` filter a list's search understands, with the values it offers as hints. */
export type ListSearchFacet = {
  description: string;
  /** Values shown as complete `key:value` examples when the query is empty; the first two by default. */
  examples?: readonly string[];
  /** Leads this key's hint rows; the generic filter icon when absent. */
  icon?: Icon;
  key: string;
  /** Heading above this key's values (`Assignee`); the capitalised key when absent. */
  label?: string;
  values: ReadonlyArray<{ description?: string; value: string }>;
};

/** What a search string means: its `key:value` filters (a key repeated is any-of) and the free text. */
export type ParsedListSearch = {
  filters: Readonly<Record<string, readonly string[]>>;
  text: string;
};

/**
 * One word of a search: a recognised `key:value` filter, a recognised key with no value yet
 * (`assignee:`, which filters nothing), or plain text.
 */
export type ListSearchToken =
  | { key: string; kind: 'filter'; raw: string; value: string }
  | { key: string; kind: 'key'; raw: string }
  | { kind: 'text'; raw: string };

/** One completion offered under the search input. */
export type ListSearchSuggestion = {
  description?: string;
  /** The group heading it sits under, when it has one. */
  group?: string;
  /** The leading icon of its row. */
  icon?: Icon;
  /** The text that replaces the token being typed. */
  insert: string;
  label: string;
};

/** A name as a filter value: lower case, no spaces, so `Sam Lee` is `sam-lee`. */
export function listSearchSlug(name: string) {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLocaleLowerCase()
    .replace(/\s+/gu, '-');
}

/** Stable person values, including duplicate names and names reserved by a filter. */
export function listSearchPersonSlugs(
  people: ReadonlyArray<{ key: string; name: string }>,
  reserved: readonly string[] = ['me', 'unassigned']
): Map<string, string> {
  const slugs = new Map<string, string>();
  const reservedValues = new Set(reserved);
  const ordered = [...people].sort(
    (left, right) => left.name.localeCompare(right.name) || left.key.localeCompare(right.key)
  );
  for (const { key, name } of ordered) {
    const base = listSearchSlug(name) || 'member';
    let slug = base;
    for (let suffix = 2; reservedValues.has(slug) || slugs.has(slug); suffix += 1) {
      slug = `${base}-${suffix}`;
    }
    slugs.set(slug, key);
  }
  return slugs;
}

/** A word of a search, or the whitespace between words, in order and verbatim. */
export type ListSearchSegment = { kind: 'space'; raw: string } | ListSearchToken;

/** Splits a search into words and the spaces between them, marking `key:value` ones for the keys. */
export function segmentListSearch(query: string, keys: readonly string[]): ListSearchSegment[] {
  const known = new Set(keys.map((key) => key.toLocaleLowerCase()));
  return (query.match(/\s+|\S+/gu) ?? []).map((raw): ListSearchSegment => {
    if (/^\s/u.test(raw)) return { kind: 'space', raw };
    const colon = raw.indexOf(':');
    const key = colon > 0 ? raw.slice(0, colon).toLocaleLowerCase() : '';
    if (!known.has(key)) return { kind: 'text', raw };
    const value = raw.slice(colon + 1);
    return value
      ? { key, kind: 'filter', raw, value: value.toLocaleLowerCase() }
      : { key, kind: 'key', raw };
  });
}

/** Splits a search into words, marking the `key:value` ones for the given keys. */
export function tokenizeListSearch(query: string, keys: readonly string[]): ListSearchToken[] {
  return segmentListSearch(query, keys).filter(
    (segment): segment is ListSearchToken => segment.kind !== 'space'
  );
}

/**
 * Splits a search into `key:value` filters for the given keys and the free text left over. A key
 * with no value yet (`assignee:`) is neither: it is still being typed.
 */
export function parseListSearch(query: string, keys: readonly string[]): ParsedListSearch {
  const filters: Record<string, string[]> = {};
  const text: string[] = [];
  for (const token of tokenizeListSearch(query, keys)) {
    if (token.kind === 'filter') filters[token.key] = [...(filters[token.key] ?? []), token.value];
    else if (token.kind === 'text') text.push(token.raw);
  }
  return { filters, text: text.join(' ') };
}

/** The last word of the query, which is the one a suggestion completes. */
export function listSearchLastWord(query: string) {
  return /\S*$/u.exec(query)?.[0] ?? '';
}

const keysGroup = 'Filters';

/** The shortest free word that is offered matching keys, so one stray letter suggests nothing. */
const minKeyPrefix = 2;

/** The heading over a key's values. */
function facetHeading(facet: ListSearchFacet) {
  return facet.label ?? facet.key.charAt(0).toLocaleUpperCase() + facet.key.slice(1);
}

/**
 * Completions for the word being typed. An empty query offers complete examples; a word of at
 * least two letters offers the keys it prefixes, and after the colon the values of its key. A
 * finished word (the query ends in a space) offers nothing, so the list never jumps while words
 * are typed.
 */
export function listSearchSuggestions(
  query: string,
  facets: readonly ListSearchFacet[]
): ListSearchSuggestion[] {
  if (query.trim() === '') {
    return facets.flatMap((facet) =>
      (facet.examples ?? facet.values.slice(0, 2).map(({ value }) => value)).map((value) => ({
        description:
          facet.values.find((candidate) => candidate.value === value)?.description ??
          facet.description,
        group: keysGroup,
        ...(facet.icon ? { icon: facet.icon } : {}),
        insert: `${facet.key}:${value} `,
        label: `${facet.key}:${value}`
      }))
    );
  }
  const token = listSearchLastWord(query);
  if (token === '') return [];
  const colon = token.indexOf(':');
  if (colon > 0) {
    const key = token.slice(0, colon);
    const facet = facets.find((candidate) => candidate.key === key.toLocaleLowerCase());
    if (!facet) return [];
    const prefix = token.slice(colon + 1).toLocaleLowerCase();
    return facet.values
      .filter(({ value }) => value.startsWith(prefix))
      .map(({ description, value }) => ({
        ...(description ? { description } : {}),
        group: facetHeading(facet),
        ...(facet.icon ? { icon: facet.icon } : {}),
        insert: `${key}:${value} `,
        label: `${key}:${value}`
      }));
  }
  const prefix = token.toLocaleLowerCase();
  if (prefix.length < minKeyPrefix) return [];
  return facets
    .filter((facet) => facet.key.startsWith(prefix))
    .map((facet) => ({
      description: facet.description,
      group: keysGroup,
      ...(facet.icon ? { icon: facet.icon } : {}),
      insert: `${facet.key}:`,
      label: `${facet.key}:`
    }));
}

/** The query with the word being typed replaced by the suggestion. */
export function applyListSearchSuggestion(query: string, suggestion: ListSearchSuggestion) {
  return query.slice(0, query.length - listSearchLastWord(query).length) + suggestion.insert;
}
