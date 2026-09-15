import { describe, expect, test } from 'vitest';
import { createFfmpegPasses } from '#src/readme-gif';

describe('README GIF conversion', () => {
  test('generates the palette before streaming frames through it', () => {
    const passes = createFfmpegPasses({
      input: 'showcase.mp4',
      output: 'groam-demo.gif',
      palette: 'groam-demo.palette.png'
    });

    expect(passes).toHaveLength(2);
    expect(passes[0]?.join(' ')).toContain('palettegen=max_colors=128:stats_mode=diff');
    expect(passes[0]?.join(' ')).not.toContain('split');
    expect(passes[1]).toEqual(
      expect.arrayContaining(['-i', 'groam-demo.palette.png', '-filter_complex'])
    );
    expect(passes[1]?.at(-1)).toBe('groam-demo.gif');
  });
});
