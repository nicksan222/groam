import type { ActorCapture } from '#src/model';
import { atTime, mix, smooth } from '#src/timeline';

export function Cursor({
  events,
  atMs,
  width,
  height
}: {
  events: ActorCapture['cursor'];
  atMs: number;
  width: number;
  height: number;
}) {
  const current = atTime(events, atMs);
  if (!current) return null;
  const next = events[events.indexOf(current) + 1];
  const progress = next ? smooth((atMs - current.atMs) / Math.max(1, next.atMs - current.atMs)) : 0;
  const x = mix(current.x, next?.x ?? current.x, progress) * width;
  const y = mix(current.y, next?.y ?? current.y, progress) * height;
  const click = atTime(
    events.filter((event) => event.click),
    atMs
  );
  const ripple = click ? (atMs - click.atMs) / 550 : 1;
  return (
    <>
      {click && ripple < 1 ? (
        <div
          style={{
            position: 'absolute',
            left: click.x * width - 18,
            top: click.y * height - 18,
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: '2px solid var(--primary)',
            opacity: 1 - ripple,
            transform: `scale(${0.5 + ripple * 1.5})`
          }}
        />
      ) : null}
      <svg
        width="24"
        height="30"
        viewBox="0 0 24 30"
        style={{
          position: 'absolute',
          left: x,
          top: y,
          overflow: 'visible',
          filter: 'drop-shadow(0 2px 3px var(--scrim))'
        }}
      >
        <path
          d="M2 2 L2 24 L8 18 L13 28 L17 26 L12 16 L21 16 Z"
          fill="var(--primary)"
          stroke="var(--primary-foreground)"
          strokeWidth="1.5"
        />
      </svg>
    </>
  );
}
