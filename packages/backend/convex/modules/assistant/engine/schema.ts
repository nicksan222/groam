import { type Infer, v } from 'convex/values';
import type { WaitKind, WaitOutcome } from '#convex/modules/assistant/waits/schema';

/** What the workflow journals for a resume: an id and a reason. The turn loads the rest. */
export const waitResumeValidator = v.object({
  reason: v.union(v.literal('met'), v.literal('deadline'), v.literal('cancelled')),
  waitId: v.string()
});

export const turnResultValidator = v.union(
  v.object({ kind: v.literal('done') }),
  v.object({ kind: v.literal('aborted') }),
  v.object({ error: v.string(), kind: v.literal('failed') }),
  v.object({ eventId: v.string(), kind: v.literal('wait') })
);

export const runOutcomeValidator = v.union(
  v.object({ kind: v.literal('done') }),
  v.object({ kind: v.literal('aborted') }),
  v.object({ error: v.string(), kind: v.literal('failed') }),
  v.object({ kind: v.literal('exhausted') })
);

export type WaitResume = Infer<typeof waitResumeValidator>;
export type TurnResult = Infer<typeof turnResultValidator>;
export type RunOutcome = Infer<typeof runOutcomeValidator>;

export const RUN_STALLED_ERROR = 'The run stopped responding. Try again.';
export const RUN_EXHAUSTED_ERROR = 'The run reached its turn limit.';
export const RECONNECT_CHATGPT_LABEL = 'Reconnect ChatGPT to continue';

const notePrefix = {
  cancelled: 'Wait cancelled',
  deadline: 'Wait expired',
  met: 'Wait met'
} as const;

/** Hidden system note that tells the model why it woke up. */
export function resumeNote({ kind, outcome }: { kind: WaitKind; outcome: WaitOutcome }): string {
  if (kind === 'timer' && outcome.reason === 'deadline') {
    return 'Wait met: timer elapsed. Continue the task.';
  }
  return `${notePrefix[outcome.reason]}: ${outcome.summary}. Continue the task with this outcome.`;
}

/** The note when the wait row is gone: the reason alone, with the same prefixes. */
export function resumeFallbackNote(reason: WaitResume['reason']): string {
  return `${notePrefix[reason]}. Continue the task.`;
}

const CONNECTION_ERRORS = [
  'Connect ChatGPT',
  'Select an available ChatGPT model',
  'ChatGPT plan usage is unavailable'
];

/** The creator's ChatGPT connection is missing or unusable (not a model or tool failure). */
export function isConnectionError(message: string): boolean {
  return CONNECTION_ERRORS.some((prefix) => message.includes(prefix));
}
