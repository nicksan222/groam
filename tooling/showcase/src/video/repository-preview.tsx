import { brandIdentity } from '@groam/brand/identity';
import { BrandMark } from '@groam/brand/mark';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import type { Project } from '#src/model';

export function RepositoryPreview({ capture }: Project) {
  const actor = capture.actors[0];
  const frame = actor?.frames.at(-1);
  if (!(actor && frame)) throw new Error('Repository preview needs a captured product frame.');

  return (
    <AbsoluteFill
      className="dark"
      style={{
        background: 'var(--canvas)',
        color: 'var(--foreground)',
        display: 'flex',
        fontFamily: 'var(--font-sans)',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          alignItems: 'flex-start',
          display: 'flex',
          flexDirection: 'column',
          padding: '72px 0 64px 76px',
          width: 520,
          zIndex: 2
        }}
      >
        <div style={{ alignItems: 'center', display: 'flex', gap: 20 }}>
          <BrandMark decorative style={{ height: 72, width: 72 }} />
          <span style={{ fontSize: 48, fontWeight: 680, letterSpacing: -2.5 }}>
            {brandIdentity.name.toLowerCase()}
          </span>
        </div>
        <h1
          style={{
            fontSize: 66,
            fontWeight: 650,
            letterSpacing: -4.5,
            lineHeight: 0.98,
            margin: '66px 0 28px',
            maxWidth: 460
          }}
        >
          Group trips,
          <br />
          finally in sync.
        </h1>
        <p
          style={{
            color: 'var(--muted-foreground)',
            fontSize: 24,
            lineHeight: 1.4,
            margin: 0,
            maxWidth: 390
          }}
        >
          Shared plans, reviewable ideas, and AI that knows where you are.
        </p>
        <div
          style={{
            color: 'var(--primary)',
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: 2.4,
            marginTop: 'auto'
          }}
        >
          OPEN SOURCE · LOCAL-FIRST
        </div>
      </div>

      <div
        style={{
          background: 'var(--primary)',
          height: 760,
          position: 'absolute',
          right: 166,
          top: -60,
          transform: 'rotate(9deg)',
          width: 230
        }}
      />
      <div
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 26,
          boxShadow: 'var(--shadow-2xl)',
          height: 540,
          overflow: 'hidden',
          position: 'absolute',
          right: -270,
          top: 50,
          transform: 'rotate(-2deg)',
          width: 960,
          zIndex: 1
        }}
      >
        <div
          style={{
            alignItems: 'center',
            background: 'var(--popover)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            fontSize: 16,
            fontWeight: 650,
            gap: 12,
            height: 48,
            padding: '0 22px'
          }}
        >
          <span
            style={{ background: 'var(--primary)', borderRadius: '50%', height: 9, width: 9 }}
          />
          {actor.label}
        </div>
        <Img
          src={staticFile(frame.src)}
          style={{ display: 'block', height: 540, objectFit: 'cover', width: 960 }}
        />
      </div>
    </AbsoluteFill>
  );
}
