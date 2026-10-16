import { commands } from 'vite-plus/test/browser';
import type { BrowserCommand } from 'vite-plus/test/node';
import type { environmentCommands } from './commands';

/** Changes to the browser a real user could make: permissions, color scheme, network answers. */
export type Environment = {
  [
    Name in keyof typeof environmentCommands
  ]: (typeof environmentCommands)[Name] extends BrowserCommand<infer Args>
    ? (...args: Args) => Promise<void>
    : never;
};

declare module 'vitest/internal/browser' {
  interface BrowserCommands extends Environment {}
}

export const environment: Environment = commands;

/** Starts a test as a fresh visitor: no remembered session, group or theme, and no cookies. */
export async function forgetPreviousVisit(): Promise<void> {
  localStorage.clear();
  sessionStorage.clear();
  await environment.clearCookies();
}
