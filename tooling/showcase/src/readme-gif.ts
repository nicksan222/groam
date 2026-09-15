import { execFile } from 'node:child_process';
import { mkdir, rename, stat } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import ffmpeg from '@ffmpeg-installer/ffmpeg';

const input = fileURLToPath(new URL('../artifacts/showcase.mp4', import.meta.url));
const output = fileURLToPath(new URL('../../../docs/assets/groam-demo.gif', import.meta.url));
const temporaryOutput = `${output}.tmp.gif`;
const maxBytes = 95 * 1024 * 1024;
const run = promisify(execFile);

await mkdir(dirname(output), { recursive: true });

const filter =
  '[0:v]fps=10,scale=1920:1080:flags=lanczos,split[frames][palette-input];[palette-input]palettegen=max_colors=128:stats_mode=diff[palette];[frames][palette]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle';

await run(ffmpeg.path, [
  '-hide_banner',
  '-loglevel',
  'error',
  '-y',
  '-i',
  input,
  '-filter_complex',
  filter,
  '-loop',
  '0',
  temporaryOutput
]);

const { size } = await stat(temporaryOutput);
if (size > maxBytes) {
  throw new Error(
    `README GIF is ${(size / 1024 / 1024).toFixed(2)} MiB; limit is ${maxBytes / 1024 / 1024} MiB.`
  );
}

await rename(temporaryOutput, output);
console.info(`README GIF generated: ${output} (${(size / 1024 / 1024).toFixed(2)} MiB)`);
