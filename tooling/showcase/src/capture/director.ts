import { setTimeout } from 'node:timers/promises';
import type { Page } from '@playwright/test';
import { createActor } from '#src/capture/actor';
import type { Director } from '#src/capture/scenario';
import { type ActorCapture, type Capture, shotStyleSchema } from '#src/model';

export function createDirector(
  actors: ActorCapture[],
  pages: Record<string, Page>,
  now: () => number
) {
  const performers = new Map(
    actors.map((actor) => [actor.id, createActor(pages[actor.id], actor.cursor, now)])
  );
  const shots: Capture['shots'] = [];
  let active = false;
  const director: Director = {
    actor(id) {
      const actor = performers.get(id);
      if (!actor) throw new Error(`Unknown actor: ${id}`);
      return actor;
    },
    async hold(milliseconds) {
      if (!Number.isFinite(milliseconds) || milliseconds < 0 || milliseconds > 60_000) {
        throw new Error('Hold must be between 0 and 60000 ms.');
      }
      await setTimeout(milliseconds);
    },
    async scene(input, action) {
      if (active)
        throw new Error('Scenes must run sequentially; parallelize actions inside a scene.');
      const style = shotStyleSchema.parse(input);
      if (
        shots.some((shot) => shot.style.id === style.id) ||
        style.actors.some((id) => !performers.has(id))
      ) {
        throw new Error(`Duplicate scene or unknown actor in ${style.id}`);
      }
      active = true;
      console.info(`Recording: ${style.title}`);
      const startMs = now();
      try {
        await action();
        shots.push({ style, startMs, endMs: now() });
      } finally {
        active = false;
      }
    }
  };
  return { director, shots };
}
