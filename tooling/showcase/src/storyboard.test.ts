import { describe, expect, it } from 'vitest';
import { video } from '#showcase';
import {
  action,
  defineVideo,
  grid,
  parallel,
  pip,
  shot,
  solo,
  split
} from '#src/authoring/storyboard';
import type { Director } from '#src/capture/scenario';
import { createEdit } from '#src/edit';
import { projectSchema } from '#src/model';
import { cinemaPresentation, desktopCapture } from '#src/presets';
import { testCapture, testVideo } from '#src/test-fixtures';
import { durationInFrames, sceneTime } from '#src/timeline';

describe('storyboard authoring', () => {
  it('provides widescreen 4K and dark desktop capture defaults', () => {
    expect(testVideo.capture).toEqual(desktopCapture);
    expect(testVideo.presentation.width).toBe(3840);
    expect(testVideo.presentation.height).toBe(2160);
    expect(cinemaPresentation.fps).toBe(60);
    expect(createEdit(testCapture, testVideo)).toMatchObject({ introFrames: 0, outroFrames: 0 });
  });

  it('edits titles, views and shot order from source while retaining captured timings', () => {
    const revised = {
      ...testVideo,
      storyboard: [shot('chat', 'A better title', { view: solo(testVideo.actors[0]) })]
    };
    const edit = createEdit(testCapture, revised);
    expect(edit.scenes[0].style.title).toBe('A better title');
    expect(edit.scenes[0].style.layout).toBe('solo');
    expect(edit.scenes[0].startMs).toBe(100);
    expect(edit.scenes[0].endMs).toBe(2000);
    expect(projectSchema.safeParse({ capture: testCapture, edit }).success).toBe(true);
  });

  it('applies trims and speed to the shared source clock without recapturing', () => {
    const video = {
      ...testVideo,
      storyboard: [
        shot('chat', 'Trimmed', {
          view: split(testVideo.actors[0], testVideo.actors[1]),
          trimStart: 0.2,
          trimEnd: 0.3,
          speed: 2
        })
      ]
    };
    const edit = createEdit(testCapture, video);
    expect(edit.scenes[0]).toMatchObject({ startMs: 300, endMs: 1700, playbackRate: 2 });
    expect(projectSchema.safeParse({ capture: testCapture, edit }).success).toBe(true);
    video.storyboard[0].trimEnd = 2;
    expect(() => createEdit(testCapture, video)).toThrow('Trimming removes');
  });

  it('rejects output that would distort the desktop composition', () => {
    const edit = createEdit(testCapture, testVideo);
    expect(
      projectSchema.safeParse({ capture: testCapture, edit: { ...edit, height: 2000 } }).success
    ).toBe(false);
  });
  it('requires a new capture for a new shot or a different film', () => {
    const revised = {
      ...testVideo,
      storyboard: [shot('new-shot', 'New', { view: solo(testVideo.actors[0]) })]
    };
    expect(() => createEdit(testCapture, revised)).toThrow('has no recording');
    expect(() => createEdit({ ...testCapture, scenario: 'different' }, testVideo)).toThrow(
      'different video'
    );
  });

  it('rejects duplicate shots and actors outside the cast', () => {
    const options = {
      id: 'test',
      actors: { owner: testVideo.actors[0] },
      prepare: async () => {},
      presentation: { title: 'Title', subtitle: '', outro: 'End' }
    };
    expect(() =>
      defineVideo(options, ({ owner }) => [
        shot('same', 'One', { view: solo(owner) }),
        shot('same', 'Two', { view: solo(owner) })
      ])
    ).toThrow();
    expect(() =>
      defineVideo(options, () => [
        shot('outside', 'Outside', { view: solo({ id: 'outsider', label: 'Other', role: '' }) })
      ])
    ).toThrow();
  });

  it('builds full-desktop views without automatic cropping', () => {
    const [owner, member] = testVideo.actors;
    for (const view of [
      solo(owner),
      split(owner, member),
      pip(owner, member),
      grid(owner, member)
    ]) {
      expect(view.actors[0]).toBe('owner');
    }
  });

  it('runs readable shots in order with transition time before each action', async () => {
    const observed: string[] = [];
    const director: Director = {
      actor() {
        throw new Error('No actor needed');
      },
      hold: async (ms) => {
        observed.push(`hold:${ms}`);
      },
      scene: async (style, run) => {
        observed.push(style.id);
        await run();
      }
    };
    const video = defineVideo(
      {
        id: 'sequence',
        actors: { owner: testVideo.actors[0] },
        prepare: async () => {},
        presentation: { title: 'Title', subtitle: '', outro: 'End' }
      },
      ({ owner }) => [
        shot('first', 'First', {
          view: solo(owner),
          leadIn: 0.8,
          hold: 2,
          steps: [
            action('A user acts', async () => {
              observed.push('action');
            })
          ]
        }),
        shot('second', 'Second', { view: solo(owner), leadIn: 0, hold: 1 })
      ]
    );
    await video.run(director);
    expect(observed).toEqual([
      'first',
      'hold:800',
      'action',
      'hold:2000',
      'second',
      'hold:0',
      'hold:1000'
    ]);
  });

  it('waits for all parallel participants before propagating a failure', async () => {
    let finished = false;
    const director: Director = {
      actor() {
        throw new Error('unused');
      },
      hold: async () => {},
      scene: async () => {}
    };
    const steps = parallel(
      action('Fails', async () => {
        throw new Error('failure');
      }),
      action('Finishes', async () => {
        await Promise.resolve();
        finished = true;
      })
    );
    await expect(steps.run(director)).rejects.toThrow('Parallel actions failed');
    expect(finished).toBe(true);
  });
});

it('fits variable capture time into exactly thirty seconds with a readable final state', () => {
  const storyboard = [
    shot('chat', 'Fixed beat', { view: solo(testVideo.actors[0]), seconds: 30, hold: 0.5 })
  ];
  const edit = createEdit(testCapture, { ...testVideo, storyboard });
  expect(durationInFrames(edit)).toBe(30 * edit.fps);
  const scene = edit.scenes[0];
  expect(sceneTime(scene, 0, edit.fps)).toBe(scene.startMs);
  expect(sceneTime(scene, 30 * edit.fps - 1, edit.fps)).toBeCloseTo(scene.endMs - 0.001);
  expect(sceneTime(scene, 30 * edit.fps - 20, edit.fps)).toBeCloseTo(scene.endMs - 0.001);
  const times = Array.from({ length: 30 * edit.fps }, (_, frame) =>
    sceneTime(scene, frame, edit.fps)
  );
  expect(times.every((time, index) => index === 0 || time >= times[index - 1])).toBe(true);
  const slower = {
    ...testCapture,
    durationMs: 120_000,
    shots: testCapture.shots.map((take) => ({ ...take, endMs: 120_000 }))
  };
  expect(durationInFrames(createEdit(slower, { ...testVideo, storyboard }))).toBe(30 * edit.fps);
  expect(() =>
    shot('invalid', 'Invalid', { view: solo(testVideo.actors[0]), seconds: 0 })
  ).toThrow();
});

it('gives the expanded walkthrough readable scenes and a three-to-four minute runtime', () => {
  const capture = {
    ...testCapture,
    scenario: video.id,
    shots: video.storyboard.map(({ style }, index) => ({
      style,
      startMs: 100 + index * 1000,
      endMs: 1100 + index * 1000
    }))
  };
  const seconds = durationInFrames(createEdit(capture, video)) / video.presentation.fps;
  expect(seconds).toBeGreaterThanOrEqual(180);
  expect(seconds).toBeLessThanOrEqual(240);
  expect(video.storyboard.every((scene) => (scene.seconds ?? 0) >= 5)).toBe(true);
  expect(video.presentation.resultHoldSeconds).toBeGreaterThanOrEqual(2);
});

it('reserves the configured reading time while keeping both users on the same clock', () => {
  const definition = {
    ...testVideo,
    presentation: { ...testVideo.presentation, resultHoldSeconds: 2 },
    storyboard: [
      shot('chat', 'Read the result', {
        view: split(testVideo.actors[0], testVideo.actors[1]),
        seconds: 6,
        hold: 0.5
      })
    ]
  };
  const edit = createEdit(testCapture, definition);
  const scene = edit.scenes[0];
  expect(scene.holdFrames).toBe(2 * edit.fps);
  expect(sceneTime(scene, 3 * edit.fps, edit.fps)).toBeLessThan(scene.endMs - 0.001);
  for (let frame = 4 * edit.fps; frame < 6 * edit.fps; frame++) {
    expect(sceneTime(scene, frame, edit.fps)).toBeCloseTo(scene.endMs - 0.001);
  }
});
