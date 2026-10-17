import { Fragment } from 'react';

const URL_PATTERN = /\b(?:https?:\/\/|www\.)[^\s<>"]+/gi;
const TRAILING_PUNCTUATION = /[.,;:!?'"]+$/;

export type TextSegment =
  | { kind: 'text'; value: string }
  | { href: string; kind: 'link'; value: string };

/** Splits plain text into text and URL segments; trailing punctuation and unmatched ")" stay text. */
export function splitLinks(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let cursor = 0;
  for (const match of text.matchAll(URL_PATTERN)) {
    const value = trimUrl(match[0]);
    const start = match.index;
    if (start > cursor) segments.push({ kind: 'text', value: text.slice(cursor, start) });
    segments.push({
      href: value.startsWith('www.') ? `https://${value}` : value,
      kind: 'link',
      value
    });
    cursor = start + value.length;
  }
  if (cursor < text.length) segments.push({ kind: 'text', value: text.slice(cursor) });
  return segments;
}

function trimUrl(raw: string): string {
  let url = raw;
  for (;;) {
    const next = url.replace(TRAILING_PUNCTUATION, '');
    const unbalanced =
      next.endsWith(')') && next.split('(').length < next.split(')').length
        ? next.slice(0, -1)
        : next;
    if (unbalanced === url) return url;
    url = unbalanced;
  }
}

/** Plain text with http(s) and www. URLs rendered as external links. */
export function LinkifiedText({ text }: { text: string }) {
  let offset = 0;
  return splitLinks(text).map((segment) => {
    // Segments tile the text, so each start offset is a stable, unique key.
    const key = `${segment.kind}:${offset}`;
    offset += segment.value.length;
    return segment.kind === 'link' ? (
      <a
        className="underline underline-offset-2 break-all hover:text-primary"
        href={segment.href}
        key={key}
        rel="noopener noreferrer"
        target="_blank"
      >
        {segment.value}
      </a>
    ) : (
      <Fragment key={key}>{segment.value}</Fragment>
    );
  });
}
