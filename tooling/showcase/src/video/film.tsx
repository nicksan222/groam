import {
  AbsoluteFill,
  Html5Audio,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig
} from 'remotion';
import type { Project } from '#src/model';
import { designCanvas } from '#src/presets';
import { durationInFrames, timelineScenes } from '#src/timeline';
import { Scene } from '#video/scene';
import { TitleCard } from '#video/title-card';

export function Film({ capture, edit }: Project) {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const total = durationInFrames(edit);
  return (
    <AbsoluteFill
      className="dark"
      style={{
        background: 'var(--canvas)',
        color: 'var(--foreground)',
        fontFamily: 'var(--font-sans)'
      }}
    >
      <div
        style={{
          position: 'absolute',
          ...designCanvas,
          transformOrigin: '0 0',
          transform: `scale(${width / designCanvas.width})`
        }}
      >
        {edit.introFrames > 0 ? (
          <Sequence durationInFrames={edit.introFrames}>
            <TitleCard title={edit.title} subtitle={edit.subtitle} duration={edit.introFrames} />
          </Sequence>
        ) : null}
        {timelineScenes(edit).map(({ scene, from, duration }, index) => (
          <Sequence key={scene.style.id} from={from} durationInFrames={duration}>
            <Scene
              project={{ capture, edit }}
              scene={scene}
              previous={edit.scenes[index - 1]}
              index={index}
            />
          </Sequence>
        ))}
        {edit.outroFrames > 0 ? (
          <Sequence from={total - edit.outroFrames} durationInFrames={edit.outroFrames}>
            <TitleCard title={edit.outro} subtitle="" duration={edit.outroFrames} />
          </Sequence>
        ) : null}
        {edit.audio ? (
          <Html5Audio
            src={staticFile(edit.audio.src)}
            volume={(f) =>
              (edit.audio?.volume ?? 0) *
              Math.min(1, f / edit.fps, Math.max(0, (total - f) / edit.fps))
            }
          />
        ) : null}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            height: 3,
            width: `${(frame / Math.max(1, total - 1)) * 100}%`,
            background: 'var(--primary)'
          }}
        />
      </div>
    </AbsoluteFill>
  );
}
