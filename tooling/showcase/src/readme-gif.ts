import { execFile } from 'node:child_process';
import { mkdir, rename, rm, stat } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import ffmpeg from '@ffmpeg-installer/ffmpeg';

const input = fileURLToPath(new URL('../artifacts/showcase.mp4', import.meta.url));
const output = fileURLToPath(new URL('../../../docs/assets/groam-demo.gif', import.meta.url));
const temporaryOutput = `${output}.tmp.gif`;
const temporaryPalette = `${output}.tmp.png`;
const maxBytes = 95 * 1024 * 1024;
const run = promisify(execFile);

const scaledFrames = 'fps=10,scale=1920:1080:flags=lanczos';
const paletteFilter = `${scaledFrames},palettegen=max_colors=128:stats_mode=diff`;
const gifFilter = `[0:v]${scaledFrames}[frames];[frames][1:v]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle`;

export function createFfmpegPasses(paths: { input: string; output: string; palette: string }) {
  return [
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-i',
      paths.input,
      '-vf',
      paletteFilter,
      '-frames:v',
      '1',
      paths.palette
    ],
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-i',
      paths.input,
      '-i',
      paths.palette,
      '-filter_complex',
      gifFilter,
      '-loop',
      '0',
      paths.output
    ]
  ];
}

if (import.meta.main) {
  await mkdir(dirname(output), { recursive: true });

  try {
    for (const args of createFfmpegPasses({
      input,
      output: temporaryOutput,
      palette: temporaryPalette
    })) {
      await run(ffmpeg.path, args);
    }

    const { size } = await stat(temporaryOutput);
    if (size > maxBytes) {
      throw new Error(
        `README GIF is ${(size / 1024 / 1024).toFixed(2)} MiB; limit is ${maxBytes / 1024 / 1024} MiB.`
      );
    }

    await rename(temporaryOutput, output);
    console.info(`README GIF generated: ${output} (${(size / 1024 / 1024).toFixed(2)} MiB)`);
  } finally {
    await rm(temporaryPalette, { force: true });
  }
}
