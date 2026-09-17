import type { VideoDefinition } from '#src/authoring/storyboard';
import type { Capture, Edit } from '#src/model';

function compactSourceClock(
  capture: Capture,
  {
    actorIds,
    endMs,
    maxIdleMs,
    startMs
  }: {
    actorIds: readonly string[];
    endMs: number;
    maxIdleMs: number;
    startMs: number;
  }
) {
  const selectedActors = new Set(actorIds);
  const points = [startMs];
  for (const actor of capture.actors) {
    if (!selectedActors.has(actor.id)) continue;
    for (const event of actor.cursor) {
      if (event.atMs > startMs && event.atMs < endMs) points.push(event.atMs);
    }
  }
  points.push(endMs);
  points.sort((left, right) => left - right);
  const sourcePoints = points.filter((point, index) => index === 0 || point !== points[index - 1]);
  let playMs = 0;
  return sourcePoints.map((sourceMs, index) => {
    if (index > 0) playMs += Math.min(sourceMs - sourcePoints[index - 1], maxIdleMs);
    return { sourceMs, playMs };
  });
}

/** Recompile presentation from the storyboard without repeating browser actions. */
export function createEdit(
  capture: Capture,
  video: Pick<VideoDefinition, 'id' | 'presentation' | 'storyboard'>
): Edit {
  if (capture.scenario !== video.id) throw new Error('This capture belongs to a different video.');
  const { presentation } = video;
  const captured = new Map(capture.shots.map((item) => [item.style.id, item]));
  const frames = (seconds: number) => Math.max(0, Math.round(seconds * presentation.fps));
  return {
    title: presentation.title,
    subtitle: presentation.subtitle,
    outro: presentation.outro,
    fps: presentation.fps,
    width: presentation.width,
    height: presentation.height,
    introFrames: frames(presentation.introSeconds),
    outroFrames: frames(presentation.outroSeconds),
    transitionFrames: Math.max(1, frames(presentation.transitionSeconds)),
    audio: presentation.audio,
    scenes: video.storyboard.map(({ style, trimStart, trimEnd, speed, seconds, hold }) => {
      const take = captured.get(style.id);
      if (!take) throw new Error(`Shot "${style.id}" has no recording. Run showcase:capture.`);
      const startMs = take.startMs + trimStart * 1000;
      const endMs = take.endMs - trimEnd * 1000;
      if (endMs <= startMs) throw new Error(`Trimming removes the entire shot: ${style.id}`);
      const actionEndMs = Math.max(startMs, endMs - Math.max(0, hold - trimEnd) * 1000);
      return {
        style,
        startMs,
        endMs,
        playbackRate: speed,
        holdFrames: seconds === undefined ? undefined : frames(presentation.resultHoldSeconds),
        durationFrames: seconds === undefined ? undefined : Math.max(1, frames(seconds)),
        actionEndMs: seconds === undefined ? undefined : actionEndMs,
        sourceClock:
          seconds === undefined
            ? undefined
            : compactSourceClock(capture, {
                actorIds: style.actors,
                endMs: actionEndMs,
                maxIdleMs: presentation.maxIdleSeconds * 1000,
                startMs
              })
      };
    })
  };
}
