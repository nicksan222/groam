import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { blendRect, layoutRects, stagedRect } from '#src/layout';
import type { Edit, Project } from '#src/model';
import { designCanvas } from '#src/presets';
import { sceneFrames, sceneTime, smooth } from '#src/timeline';
import { BrowserPanel } from '#video/browser-panel';

export function Scene({
  project,
  scene,
  previous,
  index
}: {
  project: Project;
  scene: Edit['scenes'][number];
  previous?: Edit['scenes'][number];
  index: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const transition = Math.min(project.edit.transitionFrames, sceneFrames(scene, fps));
  const progress = smooth(frame / transition);
  const atMs = sceneTime(scene, frame, fps);
  const viewport = project.capture.viewport;
  const rects = layoutRects(scene.style, designCanvas.width, designCanvas.height, viewport);
  const oldRects = previous
    ? layoutRects(previous.style, designCanvas.width, designCanvas.height, viewport)
    : rects;
  const visible = Array.from(new Set([...Object.keys(oldRects), ...scene.style.actors]));
  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          left: 64,
          top: 30,
          opacity: smooth(frame / (fps * 0.2))
        }}
      >
        <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: -0.5 }}>
          {scene.style.title}
        </div>
        <div style={{ fontSize: 16, color: 'var(--muted-foreground)', marginTop: 10 }}>
          {scene.style.subtitle}
        </div>
      </div>
      {visible.map((id) => {
        const actor = project.capture.actors.find((item) => item.id === id);
        if (!actor) throw new Error(`Unknown actor: ${id}`);
        const showing = id in rects;
        const side = (scene.style.actors.indexOf(id) < 1 ? -1 : 1) as -1 | 1;
        const destination =
          rects[id] ?? stagedRect(oldRects[id], designCanvas.width, -side as -1 | 1);
        const origin = oldRects[id] ?? stagedRect(rects[id], designCanvas.width, side);
        const opacity = showing ? (id in oldRects && previous ? 1 : progress) : 1 - progress;
        if (opacity === 0) return null;
        return (
          <BrowserPanel
            key={id}
            actor={actor}
            atMs={atMs}
            viewport={viewport}
            rect={blendRect(origin, destination, progress)}
            opacity={opacity}
            layer={scene.style.actors.indexOf(id) + 1}
          />
        );
      })}
      <div
        style={{
          position: 'absolute',
          left: 64,
          right: 64,
          bottom: 38,
          display: 'flex',
          justifyContent: 'space-between',
          color: 'var(--muted-foreground)',
          fontSize: 14
        }}
      >
        <span>{project.edit.title}</span>
        <span>
          {String(index + 1).padStart(2, '0')} /{' '}
          {String(project.edit.scenes.length).padStart(2, '0')}
        </span>
      </div>
    </AbsoluteFill>
  );
}
