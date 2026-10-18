import { z } from 'zod';

import type { ActorDefinition, Director, Scenario } from '#src/capture/scenario';
import {
  type CaptureProfile,
  captureProfileSchema,
  type ShotStyle,
  shotStyleSchema
} from '#src/model';
import { cinemaPresentation, desktopCapture } from '#src/presets';

const seconds = z.number().finite().min(0).max(60);
const presentationSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().default(''),
  outro: z.string().default(''),
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
  fps: z.union([z.literal(30), z.literal(60)]),
  introSeconds: seconds,
  outroSeconds: seconds,
  transitionSeconds: seconds.positive(),
  resultHoldSeconds: seconds.default(0.65),
  maxIdleSeconds: seconds.positive().default(1.25),
  audio: z.object({ src: z.string(), volume: z.number().min(0).max(1) }).optional()
});

export type StoryShot = {
  style: ShotStyle;
  steps: readonly Step[];
  leadIn: number;
  hold: number;
  trimStart: number;
  trimEnd: number;
  speed: number;
  seconds?: number;
};

export function shot(
  id: string,
  title: string,
  options: {
    view: View;
    subtitle?: string;
    steps?: readonly Step[];
    leadIn?: number;
    hold?: number;
    trimStart?: number;
    trimEnd?: number;
    speed?: number;
    seconds?: number;
  }
): StoryShot {
  return {
    style: shotStyleSchema.parse({ id, title, subtitle: options.subtitle ?? '', ...options.view }),
    steps: options.steps ?? [],
    seconds: options.seconds === undefined ? undefined : seconds.positive().parse(options.seconds),
    leadIn: seconds.parse(options.leadIn ?? 0.75),
    hold: seconds.parse(options.hold ?? 1.5),
    trimStart: seconds.parse(options.trimStart ?? 0),
    trimEnd: seconds.parse(options.trimEnd ?? 0),
    speed: z
      .number()
      .finite()
      .min(0.25)
      .max(4)
      .parse(options.speed ?? 1)
  };
}

export type Cast = Record<string, Omit<ActorDefinition, 'id'>>;
export type CastRefs<T extends Cast> = { readonly [Key in keyof T]: ActorRef };
export type VideoDefinition = Scenario & {
  capture: CaptureProfile;
  presentation: z.infer<typeof presentationSchema>;
  storyboard: readonly StoryShot[];
};

/** One readable definition owns casting, presentation and shot order. */
export function defineVideo<T extends Cast>(
  options: {
    id: string;
    actors: T;
    prepare: Scenario['prepare'];
    capture?: CaptureProfile;
    presentation: Pick<VideoDefinition['presentation'], 'title'> &
      Partial<Omit<VideoDefinition['presentation'], 'title'>>;
  },
  build: (cast: CastRefs<T>) => readonly StoryShot[]
): VideoDefinition {
  const actors = Object.entries(options.actors).map(([id, actor]) => ({ ...actor, id }));
  const cast = Object.fromEntries(actors.map((actor) => [actor.id, actor])) as CastRefs<T>;
  const storyboard = build(cast);
  const actorIds = new Set(actors.map((actor) => actor.id));
  const shotIds = new Set(storyboard.map((item) => item.style.id));
  if (
    !storyboard.length ||
    shotIds.size !== storyboard.length ||
    storyboard.some((item) => item.style.actors.some((id) => !actorIds.has(id)))
  ) {
    throw new Error('A storyboard needs unique shot IDs and references to its own cast.');
  }
  return {
    id: options.id,
    actors,
    capture: captureProfileSchema.parse(options.capture ?? desktopCapture),
    presentation: presentationSchema.parse({ ...cinemaPresentation, ...options.presentation }),
    storyboard,
    prepare: options.prepare,
    async run(director) {
      for (const item of storyboard) {
        // oxlint-disable-next-line react-doctor/async-await-in-loop -- Scenes share one recorded timeline and must run in storyboard order.
        await director.scene(item.style, async () => {
          await director.hold(item.leadIn * 1000);
          for (const step of item.steps) {
            console.info(`  ${step.description}`);
            // oxlint-disable-next-line react-doctor/async-await-in-loop -- Steps mutate the same browser and must run in authoring order.
            await step.run(director);
          }
          await director.hold(item.hold * 1000);
        });
      }
    }
  };
}

export type Step = { description: string; run: (director: Director) => Promise<void> };

export function action(description: string, run: Step['run']): Step {
  return { description, run };
}

/** Compose a user-facing workflow with one recorded actor. */
export function perform(
  actor: ActorRef,
  description: string,
  run: (user: ReturnType<Director['actor']>, director: Director) => Promise<unknown>
): Step {
  return action(description, async (director) => {
    await run(director.actor(actor.id), director);
  });
}

/** Await all participants even if one fails, so no background action escapes its scene. */
export function parallel(...steps: Step[]): Step {
  return action(steps.map((step) => step.description).join(' + '), async (director) => {
    const results = await Promise.allSettled(steps.map((step) => step.run(director)));
    const failures = results.filter((result) => result.status === 'rejected');
    if (failures.length)
      throw new AggregateError(
        failures.map((result) => result.reason),
        'Parallel actions failed.'
      );
  });
}

export type ActorRef = Readonly<ActorDefinition>;
export type View = Pick<ShotStyle, 'layout' | 'actors'>;

export function solo(actor: ActorRef): View {
  return { layout: 'solo', actors: [actor.id] };
}

export function split(left: ActorRef, right: ActorRef): View {
  return { layout: 'split', actors: [left.id, right.id] };
}

export function pip(main: ActorRef, observer: ActorRef): View {
  return { layout: 'pip', actors: [main.id, observer.id] };
}

export function grid(...actors: [ActorRef, ActorRef, ActorRef?, ActorRef?]): View {
  return {
    layout: 'grid',
    actors: actors.flatMap((actor) => (actor ? [actor.id] : []))
  };
}
