import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createDirector } from '#src/capture/director';
import { startFrameRecorder } from '#src/capture/frame-recorder';
import type { Scenario } from '#src/capture/scenario';
import { openSession } from '#src/capture/session';
import { type ActorCapture, type Capture, captureProfileSchema, captureSchema } from '#src/model';
import { desktopCapture } from '#src/presets';

export async function recordScenario(
  scenario: Scenario,
  options: { baseUrl: string; headed: boolean; publicDir: string }
): Promise<Capture> {
  const ids = scenario.actors.map((actor) => actor.id);
  if (
    !/^[a-z][a-z0-9-]*$/u.test(scenario.id) ||
    ids.length < 1 ||
    ids.length > 4 ||
    new Set(ids).size !== ids.length ||
    ids.some((id) => !/^[a-z][a-z0-9-]*$/u.test(id))
  ) {
    throw new Error('Scenarios need 1–4 actors with unique kebab-case IDs.');
  }
  const profile = captureProfileSchema.parse(scenario.capture ?? desktopCapture);
  const pixelSize = {
    width: profile.viewport.width * profile.deviceScaleFactor,
    height: profile.viewport.height * profile.deviceScaleFactor
  };
  const session = await openSession(scenario.actors, profile, options);
  const runId = `${scenario.id}-${randomUUID()}`;
  const recorders: Array<{ id: string; recorder: Awaited<ReturnType<typeof startFrameRecorder>> }> =
    [];
  let stopped = false;
  try {
    console.info(
      `Preparing ${profile.viewport.width}×${profile.viewport.height} desktops in ${profile.colorScheme} mode…`
    );
    await scenario.prepare(session.pages);
    await Promise.all(
      Object.values(session.pages).map(async (page) => {
        const ready = await page.waitForFunction(() => document.fonts.status === 'loaded');
        await ready.dispose();
      })
    );
    const epoch = Date.now();
    const actors: ActorCapture[] = scenario.actors.map((actor) => ({
      ...actor,
      frames: [],
      cursor: []
    }));
    await Promise.all(
      actors.map(async (actor) => {
        const prefix = `captures/${runId}/${actor.id}`;
        const recorder = await startFrameRecorder({
          page: session.pages[actor.id],
          directory: join(options.publicDir, prefix),
          prefix,
          epoch,
          pixelSize
        });
        recorders.push({ id: actor.id, recorder });
      })
    );
    const { director, shots } = createDirector(actors, session.pages, () => Date.now() - epoch);
    await scenario.run(director);
    const durationMs = Date.now() - epoch;
    const results = await Promise.allSettled(
      recorders.map(async ({ id, recorder }) => ({ id, frames: await recorder.stop() }))
    );
    stopped = true;
    const failures = results.filter((result) => result.status === 'rejected');
    if (failures.length)
      throw new AggregateError(
        failures.map((result) => result.reason),
        String(failures[0].reason)
      );
    const frames = new Map(
      results.flatMap((result) =>
        result.status === 'fulfilled' ? [[result.value.id, result.value.frames] as const] : []
      )
    );
    return captureSchema.parse({
      version: 2,
      scenario: scenario.id,
      viewport: profile.viewport,
      pixelSize,
      colorScheme: profile.colorScheme,
      format: profile.format,
      durationMs,
      shots,
      actors: actors.map((actor) => ({ ...actor, frames: frames.get(actor.id) }))
    });
  } catch (error) {
    const diagnostics = join(options.publicDir, 'captures', runId, 'failure');
    await mkdir(diagnostics, { recursive: true });
    await writeFile(
      join(diagnostics, 'error.txt'),
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  } finally {
    if (!stopped) await Promise.allSettled(recorders.map(({ recorder }) => recorder.stop()));
    await session.close();
  }
}
