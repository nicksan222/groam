import { Img, staticFile } from 'remotion';
import type { Rect } from '#src/layout';
import type { ActorCapture } from '#src/model';
import { browserChromeHeight } from '#src/presets';
import { atTime } from '#src/timeline';
import { Cursor } from '#video/cursor';

export function BrowserPanel({
  actor,
  atMs,
  rect,
  opacity,
  layer,
  viewport
}: {
  actor: ActorCapture;
  atMs: number;
  rect: Rect;
  opacity: number;
  layer: number;
  viewport: { width: number; height: number };
}) {
  const frame = atTime(actor.frames, atMs);
  if (!frame) throw new Error(`No recorded frame for ${actor.id} at ${atMs}ms.`);
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: viewport.width,
        height: viewport.height + browserChromeHeight,
        transformOrigin: '0 0',
        transform: `translate(${rect.x}px, ${rect.y}px) scale(${rect.width / viewport.width})`,
        borderRadius: 18,
        overflow: 'hidden',
        background: 'var(--card)',
        opacity,
        outline: '1px solid var(--border)',
        boxShadow: 'var(--shadow-2xl)',
        zIndex: layer
      }}
    >
      <div
        style={{
          height: browserChromeHeight,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '0 24px',
          background: 'var(--popover)',
          color: 'var(--foreground)',
          fontSize: 22
        }}
      >
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: 'var(--primary)',
            flexShrink: 0
          }}
        />
        <strong>{actor.label}</strong>
        <span style={{ marginLeft: 'auto', fontSize: 18, color: 'var(--muted-foreground)' }}>
          {actor.role}
        </span>
      </div>
      <div
        style={{
          position: 'relative',
          width: viewport.width,
          height: viewport.height,
          overflow: 'hidden'
        }}
      >
        <Img
          src={staticFile(frame.src)}
          style={{ display: 'block', width: viewport.width, height: viewport.height }}
        />
        <Cursor events={actor.cursor} atMs={atMs} width={viewport.width} height={viewport.height} />
      </div>
    </div>
  );
}
