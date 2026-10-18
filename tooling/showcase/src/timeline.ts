import type { Edit } from '#src/model';

export function sceneFrames(scene: Edit['scenes'][number], fps: number) {
  return (
    scene.durationFrames ??
    Math.max(1, Math.ceil(((scene.endMs - scene.startMs) / scene.playbackRate / 1000) * fps))
  );
}

export function durationInFrames(edit: Edit) {
  return (
    edit.introFrames +
    edit.outroFrames +
    edit.scenes.reduce((sum, scene) => sum + sceneFrames(scene, edit.fps), 0)
  );
}

/** Last known state: never show a future frame before its actual capture time. */
export function atTime<T extends { atMs: number }>(
  items: readonly T[],
  atMs: number
): T | undefined {
  let lo = 0;
  let hi = items.length - 1;
  while (lo <= hi) {
    const middle = Math.floor((lo + hi) / 2);
    if (items[middle].atMs <= atMs) lo = middle + 1;
    else hi = middle - 1;
  }
  return hi < 0 ? undefined : items[hi];
}

export function smooth(value: number) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

export function mix(from: number, to: number, progress: number) {
  return from + (to - from) * progress;
}

export function timelineScenes(edit: Edit) {
  let offset = edit.introFrames;
  return edit.scenes.map((scene) => {
    const duration = sceneFrames(scene, edit.fps);
    const entry = { scene, from: offset, duration };
    offset += duration;
    return entry;
  });
}

/** Fit actions into a fixed beat, then leave its verified result readable. */
export function sceneTime(scene: Edit['scenes'][number], frame: number, fps: number) {
  if (scene.durationFrames === undefined) {
    return Math.min(scene.endMs - 0.001, scene.startMs + (frame / fps) * 1000 * scene.playbackRate);
  }
  const duration = scene.durationFrames;
  const holdFrames = Math.min(scene.holdFrames ?? Math.round(fps * 0.65), Math.floor(duration / 2));
  const progress = Math.min(1, Math.max(0, frame) / Math.max(1, duration - holdFrames - 1));
  if (progress === 1) return scene.endMs - 0.001;
  const clock = scene.sourceClock;
  if (!clock) return mix(scene.startMs, scene.actionEndMs ?? scene.endMs, progress);
  const playMs = progress * clock[clock.length - 1].playMs;
  const right = clock.findIndex((point) => point.playMs >= playMs);
  if (right <= 0) return clock[0].sourceMs;
  const from = clock[right - 1];
  const to = clock[right];
  const segment = Math.max(1, to.playMs - from.playMs);
  return mix(from.sourceMs, to.sourceMs, (playMs - from.playMs) / segment);
}
