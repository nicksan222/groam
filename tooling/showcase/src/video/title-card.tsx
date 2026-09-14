import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { designCanvas } from '#src/presets';

export function TitleCard({
  title,
  subtitle,
  duration
}: {
  title: string;
  subtitle: string;
  duration: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { width } = designCanvas;
  const enter = spring({ frame, fps, config: { damping: 22, stiffness: 90 } });
  const fade = Math.min(1, Math.max(0, (duration - frame) / (fps * 0.3)));
  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        padding: '0 12%',
        opacity: fade
      }}
    >
      <div
        style={{
          fontSize: 20,
          color: 'var(--primary)',
          letterSpacing: 5,
          marginBottom: 36,
          opacity: enter,
          transform: `translateY(${(1 - enter) * 25}px)`
        }}
      >
        GROAM
      </div>
      <div
        style={{
          fontSize: width * 0.058,
          fontWeight: 650,
          lineHeight: 1.05,
          letterSpacing: -4,
          opacity: enter,
          transform: `translateY(${(1 - enter) * 40}px) scale(${0.97 + enter * 0.03})`
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: width * 0.016,
          marginTop: 36,
          color: 'var(--muted-foreground)',
          opacity: enter
        }}
      >
        {subtitle}
      </div>
      <div
        style={{
          width: 90 * enter,
          height: 4,
          background: 'var(--primary)',
          marginTop: 52,
          borderRadius: 4
        }}
      />
    </AbsoluteFill>
  );
}
