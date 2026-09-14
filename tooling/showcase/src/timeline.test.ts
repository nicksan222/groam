import { describe, expect, it } from 'vitest';
import { createEdit } from '#src/edit';
import { blendRect, layoutRects, stagedRect } from '#src/layout';
import type { ShotStyle } from '#src/model';
import { browserChromeHeight } from '#src/presets';
import { testCapture, testVideo } from '#src/test-fixtures';
import { atTime, durationInFrames, sceneFrames, sceneTime } from '#src/timeline';

describe('showcase timeline', () => {
  it('uses the most recent captured state without leaking a future update', () => {
    const frames = [
      { atMs: 100, value: 'before' },
      { atMs: 245, value: 'after' }
    ];
    expect(atTime(frames, 99)).toBeUndefined();
    expect(atTime(frames, 244)?.value).toBe('before');
    expect(atTime(frames, 245)?.value).toBe('after');
    expect(atTime(frames, 9000)?.value).toBe('after');
    expect(atTime([], 0)).toBeUndefined();
  });

  it('keeps unequal actor capture rates aligned to the shared timeline', () => {
    const sender = [
      { atMs: 0, value: 'empty' },
      { atMs: 180, value: 'sent' }
    ];
    const receiver = [
      { atMs: 15, value: 'empty' },
      { atMs: 340, value: 'received' }
    ];
    expect(atTime(sender, 250)?.value).toBe('sent');
    expect(atTime(receiver, 250)?.value).toBe('empty');
    expect(atTime(receiver, 340)?.value).toBe('received');
  });

  it('rounds fractional scenes up and accounts for speed, intro and outro', () => {
    const style: ShotStyle = {
      id: 'one',
      title: 'One',
      subtitle: '',
      layout: 'solo',
      actors: ['owner']
    };
    const scene = { style, startMs: 100, endMs: 1101, playbackRate: 2 };
    expect(sceneFrames(scene, 30)).toBe(16);
    const edit = {
      ...createEdit(testCapture, testVideo),
      scenes: [scene]
    };
    expect(durationInFrames(edit)).toBe(edit.introFrames + 16 + edit.outroFrames);
  });

  it.each(['solo', 'split', 'pip', 'grid'] as const)(
    'fits %s screens inside the stage',
    (layout) => {
      const actors =
        layout === 'solo'
          ? ['one']
          : layout === 'grid'
            ? ['one', 'two', 'three', 'four']
            : ['one', 'two'];
      const rects = layoutRects(
        { id: 'test', title: 'Test', subtitle: '', layout, actors },
        1920,
        1080,
        { width: 1920, height: 1080 }
      );
      for (const actor of actors) {
        const rect = rects[actor];
        expect(rect.x).toBeGreaterThanOrEqual(0);
        expect(rect.y).toBeGreaterThanOrEqual(0);
        expect(rect.x + rect.width).toBeLessThanOrEqual(1920);
        expect(rect.y + rect.height).toBeLessThanOrEqual(1080);
        expect(rect.width / rect.height).toBeCloseTo(1920 / (1080 + browserChromeHeight));
      }
    }
  );
});

it('never squeezes or collapses a desktop during solo/split transitions', () => {
  const viewport = { width: 1920, height: 1080 };
  const base = { id: 'test', title: 'Test', subtitle: '' };
  const soloRects = layoutRects({ ...base, layout: 'solo', actors: ['one'] }, 1920, 1080, viewport);
  const splitRects = layoutRects(
    { ...base, layout: 'split', actors: ['one', 'two'] },
    1920,
    1080,
    viewport
  );
  for (let frame = 0; frame <= 60; frame++) {
    const rect = blendRect(soloRects.one, splitRects.one, frame / 60);
    expect(rect.width / rect.height).toBeCloseTo(
      viewport.width / (viewport.height + browserChromeHeight)
    );
    expect(rect.width).toBeGreaterThanOrEqual(splitRects.one.width);
  }
});

it('moves through long loading gaps quickly while preserving interaction time', () => {
  const style: ShotStyle = {
    id: 'loading',
    title: 'Loading',
    subtitle: '',
    layout: 'solo',
    actors: ['owner']
  };
  const scene = {
    style,
    startMs: 0,
    endMs: 10_001,
    actionEndMs: 10_000,
    durationFrames: 600,
    holdFrames: 0,
    playbackRate: 1,
    sourceClock: [
      { sourceMs: 0, playMs: 0 },
      { sourceMs: 1000, playMs: 1000 },
      { sourceMs: 9000, playMs: 1900 },
      { sourceMs: 10_000, playMs: 2900 }
    ]
  };
  expect(sceneTime(scene, 360, 60) - sceneTime(scene, 240, 60)).toBeGreaterThan(5000);
});

it('stages entering desktops off-center and smaller without changing their ratio', () => {
  const rect = { x: 100, y: 80, width: 1200, height: 700 };
  const entering = stagedRect(rect, 1920, 1);
  expect(entering.x).toBeGreaterThan(rect.x);
  expect(entering.width).toBeLessThan(rect.width);
  expect(entering.width / entering.height).toBeCloseTo(rect.width / rect.height);
});
