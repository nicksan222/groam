import { commands } from 'vite-plus/test/browser';
import type { JourneyBackend } from './journey-backend';

/** The backend arrangements, as a journey calls them: the calling file is passed for it. */
export type Arrange = {
  [Name in keyof JourneyBackend]: JourneyBackend[Name] extends (
    testPath: string,
    ...args: infer Args
  ) => infer Result
    ? (...args: Args) => Result
    : never;
};

declare module 'vitest/internal/browser' {
  interface BrowserCommands extends Arrange {}
}

/** Arranges data a journey does not exercise through the UI, as the test file's owner. */
export const arrange: Arrange = commands;
