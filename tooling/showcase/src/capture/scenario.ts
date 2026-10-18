import type { Page } from '@playwright/test';
import type { createActor } from '#src/capture/actor';
import type { ActorCapture, CaptureProfile, ShotStyle } from '#src/model';

export type ActorDefinition = Pick<ActorCapture, 'id' | 'label' | 'role'>;
export type Actor = ReturnType<typeof createActor>;
export type Director = {
  actor: (id: string) => Actor;
  hold: (milliseconds: number) => Promise<void>;
  scene: (style: ShotStyle, action: () => Promise<void>) => Promise<void>;
};
export type Scenario = {
  capture?: CaptureProfile;
  id: string;
  actors: ActorDefinition[];
  prepare: (pages: Record<string, Page>) => Promise<void>;
  run: (director: Director) => Promise<void>;
};
