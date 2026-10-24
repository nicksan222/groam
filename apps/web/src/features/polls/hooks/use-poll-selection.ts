import { useCallback, useRef, useState } from 'react';
import type { Poll } from '@/types/polls';

/**
 * The viewer's selection, ahead of the server while a vote is in flight. Each toggle builds on
 * the pending selection, so quick multi-select clicks never drop an earlier choice.
 */
export function usePollSelection(
  poll: Pick<Poll, 'multiSelect' | 'myOptionIds'>,
  onVote: (optionIds: string[]) => Promise<unknown>,
  onRetract: () => Promise<unknown>
) {
  const [pending, setPending] = useState<string[] | null>(null);
  const latest = useRef(0);
  const selected = pending ?? poll.myOptionIds;

  const submit = useCallback(
    (next: string[]) => {
      latest.current += 1;
      const call = latest.current;
      setPending(next);
      void (next.length === 0 ? onRetract() : onVote(next)).finally(() => {
        if (latest.current === call) setPending(null);
      });
    },
    [onRetract, onVote]
  );

  const toggle = useCallback(
    (optionId: string) => {
      if (!poll.multiSelect) return submit([optionId]);
      return submit(
        selected.includes(optionId)
          ? selected.filter((id) => id !== optionId)
          : [...selected, optionId]
      );
    },
    [poll.multiSelect, selected, submit]
  );

  const retract = useCallback(() => submit([]), [submit]);

  return { busy: pending !== null, retract, selected, toggle };
}
