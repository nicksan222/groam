import { access, mkdir, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { bundle } from '@remotion/bundler';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import type { Project } from '#src/model';
import { artifactsDir, entryPoint, publicDir } from '#src/paths';

export async function renderProject(project: Project, draft: boolean) {
  const assets = new Set(
    project.capture.actors.flatMap((actor) => actor.frames.map((frame) => frame.src))
  );
  if (project.edit.audio) assets.add(project.edit.audio.src);
  await Promise.all(
    [...assets].map(async (asset) => {
      try {
        await access(join(publicDir, asset));
      } catch {
        throw new Error(`Missing capture asset: ${asset}. Run showcase:capture again.`);
      }
    })
  );
  await mkdir(artifactsDir, { recursive: true });
  console.info('Preparing the video composition…');
  const serveUrl = await bundle({ entryPoint, publicDir });
  const composition = await selectComposition({
    serveUrl,
    id: 'GroamShowcase',
    inputProps: project
  });
  const outputLocation = join(artifactsDir, draft ? 'showcase-draft.mp4' : 'showcase.mp4');
  let lastProgress = -1;
  await renderMedia({
    serveUrl,
    composition,
    inputProps: project,
    outputLocation: outputLocation.replace(/\.mp4$/u, '.rendering.mp4'),
    codec: 'h264',
    pixelFormat: 'yuv420p',
    crf: draft ? 22 : 16,
    scale: draft ? 0.5 : 1,
    concurrency: 2,
    onProgress({ progress }) {
      const percentage = Math.floor(progress * 10) * 10;
      if (percentage !== lastProgress) {
        console.info(`Rendering ${percentage}%`);
        lastProgress = percentage;
      }
    }
  });
  await rename(outputLocation.replace(/\.mp4$/u, '.rendering.mp4'), outputLocation);
  await renderStill({
    serveUrl,
    composition,
    inputProps: project,
    output: join(artifactsDir, 'poster.png'),
    frame: Math.max(0, composition.durationInFrames - project.edit.outroFrames - 1)
  });
  await renderRepositoryPreview(project, serveUrl);
  console.info(`Video: ${outputLocation}`);
}

export async function renderRepositoryPreview(project: Project, existingServeUrl?: string) {
  await mkdir(artifactsDir, { recursive: true });
  const serveUrl = existingServeUrl ?? (await bundle({ entryPoint, publicDir }));
  const composition = await selectComposition({
    serveUrl,
    id: 'GroamRepositoryPreview',
    inputProps: project
  });
  const output = join(artifactsDir, 'repository-preview.png');
  await renderStill({ serveUrl, composition, inputProps: project, output, frame: 0 });
  console.info(`Repository preview: ${output}`);
}
