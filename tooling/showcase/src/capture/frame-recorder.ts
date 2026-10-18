import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { setTimeout } from 'node:timers/promises';
import { errors, type Page } from '@playwright/test';
import { assertPngSize } from '#src/capture/png';
import type { ActorCapture } from '#src/model';

/**
 * Chromium screencasts downsample to CSS pixels even at DPR 2. Capture the
 * compositor surface directly so every frame retains its physical resolution.
 */
export async function startFrameRecorder({
  page,
  directory,
  prefix,
  epoch,
  pixelSize
}: {
  page: Page;
  directory: string;
  prefix: string;
  epoch: number;
  pixelSize: { width: number; height: number };
}) {
  await mkdir(directory, { recursive: true });

  const frames: ActorCapture['frames'] = [];
  let stopping = false;
  let failure: unknown;
  const frameInterval = 1000 / 30;

  async function capture() {
    const options = { type: 'png', scale: 'device', caret: 'hide', timeout: 5000 } as const;
    // Navigation can invalidate a screenshot in flight; retry that transient timeout once.
    const bytes = await page.screenshot(options).catch((error: unknown) => {
      if (!(error instanceof errors.TimeoutError)) throw error;
      return page.screenshot(options);
    });
    // Completion time is conservative: a state never appears before it was observed.
    const atMs = Math.max(0, Date.now() - epoch);

    assertPngSize(bytes, pixelSize);
    const filename = `${String(frames.length).padStart(6, '0')}.png`;
    await writeFile(join(directory, filename), bytes);
    frames.push({ atMs, src: `${prefix}/${filename}` });
  }

  await capture();
  // One request in flight per actor provides backpressure without buffering PNGs.
  const loop = (async () => {
    while (!stopping) {
      const started = performance.now();
      await capture();
      await setTimeout(Math.max(0, frameInterval - (performance.now() - started)));
    }
  })().catch((error: unknown) => {
    failure = error;
  });

  return {
    async stop() {
      stopping = true;
      await loop;

      if (failure) throw failure;
      return frames;
    }
  };
}
