const graphemeSegmenter =
  typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : null;

const WHITESPACE = /\s/u;
const LOW_SURROGATE = /^[\uDC00-\uDFFF]$/u;

/** The last paragraph break past half the limit, else the last whitespace, else the limit. */
function findBreak(text: string, limit: number): number {
  const paragraphBreak = text.lastIndexOf('\n\n', limit);
  if (paragraphBreak > limit / 2) return paragraphBreak;
  for (let index = limit; index > 0; index--) {
    if (WHITESPACE.test(text[index] ?? '')) return index;
  }
  return limit;
}

/** Moves a split point back to the start of the grapheme it falls in, keeping at least one. */
function alignToGrapheme(text: string, splitAt: number): number {
  if (!graphemeSegmenter) {
    if (!LOW_SURROGATE.test(text[splitAt] ?? '')) return splitAt;
    return splitAt === 1 ? 2 : splitAt - 1;
  }
  const segments = graphemeSegmenter.segment(text);
  for (const { index, segment } of segments) {
    if (index + segment.length > splitAt) return index || segment.length;
  }
  return splitAt;
}

/** Splits long message text into a preview and the remainder shown after "Show more". */
export function splitChatMessagePreview(
  text: string,
  maxPreviewLength = 500
): { preview: string; remainder: string | null } {
  if (text.length <= maxPreviewLength) return { preview: text, remainder: null };
  const limit = Math.max(1, Math.floor(maxPreviewLength));
  const splitAt = alignToGrapheme(text, findBreak(text, limit));
  return {
    preview: text.slice(0, splitAt).trimEnd(),
    remainder: text.slice(splitAt).trimStart() || null
  };
}
