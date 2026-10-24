import type { ListSearchSegment } from './list-search-query';

/**
 * One word of a search as colour only: a key muted, its value in the foreground, and the whole
 * word on a soft chip. The chip is a background and a box-shadow, so it adds no width and the text
 * lines up with the input over it. Free text and the spaces between words stay plain.
 */
export function ListSearchToken({ segment }: { segment: ListSearchSegment }) {
  if (segment.kind === 'space' || segment.kind === 'text') return segment.raw;
  const colon = segment.raw.indexOf(':') + 1;
  return (
    <span
      className="rounded-sm bg-muted shadow-[0_0_0_2px_var(--color-muted)]"
      data-slot="list-search-token"
    >
      <span className="text-muted-foreground">{segment.raw.slice(0, colon)}</span>
      <span className="text-foreground">{segment.raw.slice(colon)}</span>
    </span>
  );
}
