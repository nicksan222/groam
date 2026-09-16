import { describe, expect, test } from 'vitest';
import { createFfmpegPasses } from '#src/readme-gif';

describe('README GIF conversion', () => {
  test('generates the palette before streaming frames through it', () => {
    const [palettePass, gifPass] = createFfmpegPasses({
      input: 'showcase.mp4',
      output: 'groam-demo.gif',
      palette: 'groam-demo.palette.png'
    });

    expect(palettePass.join(' ')).toContain('palettegen=max_colors=128:stats_mode=diff');
    expect(palettePass.join(' ')).not.toContain('split');
    expect(gifPass).toEqual(
      expect.arrayContaining(['-i', 'groam-demo.palette.png', '-filter_complex'])
    );
    expect(gifPass.at(-1)).toBe('groam-demo.gif');
  });
});
