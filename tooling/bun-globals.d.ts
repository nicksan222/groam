declare module 'bun:test' {
  export type Matcher = {
    toBe(expected: unknown): void;
    toContain(expected: unknown): void;
    toEqual(expected: unknown): void;
    toMatch(expected: unknown): void;
    toThrow(expected?: unknown): void;
  };

  export type AsyncMatcher = {
    toBe(expected: unknown): Promise<void>;
    toEqual(expected: unknown): Promise<void>;
    toThrow(expected?: unknown): Promise<void>;
  };

  export function afterEach(fn: () => void | Promise<void>): void;
  export function describe(name: string, fn: () => void): void;
  export function test(name: string, fn: () => void | Promise<void>): void;
  export function expect(actual: unknown): Matcher & {
    rejects: AsyncMatcher;
    resolves: AsyncMatcher;
  };
}

interface ImportMeta {
  main: boolean;
}

declare namespace Bun {
  const env: NodeJS.ProcessEnv;
  function sleep(milliseconds: number): Promise<void>;
  function spawn(
    command: string[],
    options?: {
      cwd?: string;
      env?: NodeJS.ProcessEnv;
      stderr?: 'inherit' | 'pipe';
      stdout?: 'inherit' | 'pipe';
    }
  ): {
    exited: Promise<number>;
    kill(signal?: NodeJS.Signals): void;
  };
}
