import { convex } from '#src/convex/cli';
import type { ReleaseTarget } from '#src/release/target';

export function deployBackend(target: ReleaseTarget, sha: string): void {
  convex(
    [
      'deploy',
      '--typecheck-components',
      '--codegen',
      'disable',
      '--message',
      `GitHub ${target.environment} main ${sha}`
    ],
    { stream: true }
  );
}
