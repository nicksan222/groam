import { z } from 'zod';

export const captureProfileSchema = z.object({
  viewport: z.object({
    width: z.number().int().min(640).max(1920),
    height: z.number().int().min(360).max(1080)
  }),
  deviceScaleFactor: z.union([z.literal(1), z.literal(2)]),
  colorScheme: z.enum(['dark', 'light']),
  format: z.literal('png')
});
export type CaptureProfile = z.infer<typeof captureProfileSchema>;

const identifier = z.string().regex(/^[a-z][a-z0-9-]*$/u);
const time = z.number().finite().nonnegative();
const unit = z.number().finite().min(0).max(1);
const asset = z
  .string()
  .refine(
    (value) =>
      /^(?:captures|audio)\/[a-zA-Z0-9/_.-]+$/u.test(value) &&
      !value.split('/').some((part) => part === '..' || part === '.'),
    'Assets must be relative paths inside captures/ or audio/'
  );

export const shotStyleSchema = z
  .object({
    id: identifier,
    title: z.string().min(1),
    subtitle: z.string().default(''),
    layout: z.enum(['solo', 'split', 'pip', 'grid']),
    actors: z.array(identifier).min(1).max(4)
  })
  .superRefine((shot, ctx) => {
    const count = shot.actors.length;
    if (
      new Set(shot.actors).size !== count ||
      (shot.layout === 'solo' && count !== 1) ||
      (['split', 'pip'].includes(shot.layout) && count !== 2)
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'Use distinct actors: solo needs 1, split/pip need 2, grid allows 1–4.'
      });
    }
  });

export const captureSchema = z
  .object({
    version: z.literal(2),
    scenario: identifier,
    viewport: z.object({ width: z.number().int().positive(), height: z.number().int().positive() }),
    pixelSize: z.object({
      width: z.number().int().positive(),
      height: z.number().int().positive()
    }),
    colorScheme: z.enum(['dark', 'light']),
    format: z.literal('png'),
    durationMs: time.positive(),
    actors: z
      .array(
        z.object({
          id: identifier,
          label: z.string().min(1),
          role: z.string(),
          frames: z.array(z.object({ atMs: time, src: asset })).min(1),
          cursor: z.array(
            z.object({ atMs: time, x: unit, y: unit, click: z.boolean().default(false) })
          )
        })
      )
      .min(1)
      .max(4),
    shots: z.array(z.object({ style: shotStyleSchema, startMs: time, endMs: time })).min(1)
  })
  .superRefine((capture, ctx) => {
    const actors = new Set(capture.actors.map((actor) => actor.id));
    if (actors.size !== capture.actors.length)
      ctx.addIssue({ code: 'custom', message: 'Duplicate actor IDs.' });
    const shots = new Set<string>();
    for (const actor of capture.actors) {
      for (const series of [actor.frames, actor.cursor]) {
        for (let i = 1; i < series.length; i++) {
          if (series[i].atMs < series[i - 1].atMs)
            ctx.addIssue({ code: 'custom', message: 'Capture timestamps must be ordered.' });
        }
      }
    }
    for (const shot of capture.shots) {
      const shotId = shot.style.id;
      if (
        shots.has(shotId) ||
        shot.endMs <= shot.startMs ||
        shot.endMs > capture.durationMs ||
        shot.style.actors.some((id) => !actors.has(id))
      ) {
        ctx.addIssue({ code: 'custom', message: `Invalid capture shot: ${shotId}` });
      }
      shots.add(shotId);
    }
  });

const editSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string(),
  outro: z.string(),
  fps: z.union([z.literal(30), z.literal(60)]).default(30),
  width: z
    .number()
    .int()
    .min(640)
    .max(3840)
    .refine((n) => n % 2 === 0),
  height: z
    .number()
    .int()
    .min(360)
    .max(2160)
    .refine((n) => n % 2 === 0),
  introFrames: z.number().int().min(0),
  outroFrames: z.number().int().min(0),
  transitionFrames: z.number().int().min(1),
  audio: z.object({ src: asset, volume: unit }).optional(),
  scenes: z
    .array(
      z.object({
        style: shotStyleSchema,
        startMs: time,
        endMs: time,
        durationFrames: z.number().int().positive().optional(),
        actionEndMs: time.optional(),
        sourceClock: z
          .array(z.object({ sourceMs: time, playMs: time }))
          .min(2)
          .optional(),
        holdFrames: z.number().int().nonnegative().optional(),
        playbackRate: z.number().min(0.25).max(4).default(1)
      })
    )
    .min(1)
});

export const projectSchema = z
  .object({ capture: captureSchema, edit: editSchema })
  .superRefine(({ capture, edit }, ctx) => {
    if (edit.width * 9 !== edit.height * 16)
      ctx.addIssue({
        code: 'custom',
        message: 'Use a 16:9 output to preserve the desktop composition.'
      });
    const actors = new Set(capture.actors.map((actor) => actor.id));
    const scenes = new Set<string>();
    for (const scene of edit.scenes) {
      const sceneId = scene.style.id;
      if (
        scenes.has(sceneId) ||
        scene.endMs <= scene.startMs ||
        (scene.actionEndMs !== undefined &&
          (scene.actionEndMs < scene.startMs || scene.actionEndMs > scene.endMs)) ||
        scene.endMs > capture.durationMs ||
        capture.actors.some((actor) => (actor.frames[0]?.atMs ?? Infinity) > scene.startMs) ||
        scene.style.actors.some((id) => !actors.has(id))
      ) {
        ctx.addIssue({ code: 'custom', message: `Invalid edit scene: ${sceneId}` });
      }
      scenes.add(sceneId);
    }
  });

export type ShotStyle = z.infer<typeof shotStyleSchema>;
export type Capture = z.infer<typeof captureSchema>;
export type Edit = z.infer<typeof editSchema>;
export type Project = z.infer<typeof projectSchema>;
export type ActorCapture = Capture['actors'][number];
