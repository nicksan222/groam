import type { StopCondition, ToolSet } from 'ai';

export type StepWithResults = { toolResults: ReadonlyArray<{ output?: unknown }> };

/** Whether the last step ran a tool that put the run into a wait (`waitFor` returns `wait: true`). */
export function endedInWait(steps: ReadonlyArray<StepWithResults>): boolean {
  return (
    steps
      .at(-1)
      ?.toolResults.some(
        (result) =>
          typeof result.output === 'object' &&
          result.output !== null &&
          (result.output as { wait?: unknown }).wait === true
      ) ?? false
  );
}

/** Ends the generation right after a tool reports that the run is now waiting. */
export const stopAfterWait: StopCondition<ToolSet> = ({ steps }) => endedInWait(steps);
