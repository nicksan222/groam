import type { Context } from 'vite-plus/lint/plugins';

// Biome counts tokens that start a new line (`skipBlankLines`), so comment-only lines and lines
// inside multi-line JSX text or template chunks do not count:
// https://github.com/biomejs/biome/blob/main/crates/biome_analyze/src/utils.rs

export type Token = { start: number; end: number; type: string; value: string };
export type LineOptions = { max: number; skipIifes: boolean };

export const lineOptionsSchema = [
  {
    type: 'object',
    properties: {
      maxLines: { type: 'integer', minimum: 1 },
      skipIifes: { type: 'boolean' }
    },
    additionalProperties: false
  }
];

export function readLineOptions(context: Context, fallback: number): LineOptions {
  const options: unknown = context.options[0];
  const read = (key: string): unknown =>
    typeof options === 'object' && options !== null ? Reflect.get(options, key) : undefined;
  const max = read('maxLines');
  return { max: typeof max === 'number' ? max : fallback, skipIifes: read('skipIifes') === true };
}

/** Tokens preceded by a line break, in source order. */
export function lineStartingTokens(context: Context): Token[] {
  const { text } = context.sourceCode;
  const tokens = context.sourceCode.getTokens(context.sourceCode.ast) as Token[];
  return tokens.filter((token, index) => {
    const previousEnd = index === 0 ? 0 : (tokens[index - 1]?.end ?? 0);
    return text.slice(previousEnd, token.start).includes('\n');
  });
}
