import { brandIdentity } from '@groam/brand/identity';
import { BrandMark } from '@groam/brand/mark';
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
          alignItems: 'center',
          display: 'flex',
          fontSize: 28,
          fontWeight: 650,
          gap: 16,
          letterSpacing: -1,
          marginBottom: 36,
          opacity: enter,
          transform: `translateY(${(1 - enter) * 25}px)`
        }}
      >
        <BrandMark decorative style={{ height: 48, width: 48 }} />
        {brandIdentity.name.toLowerCase()}
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
