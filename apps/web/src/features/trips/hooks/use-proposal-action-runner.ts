import { useAsyncAction } from '@groam/ui/hooks/use-async-action';
import { useState } from 'react';
import type { ProposalActionRunner } from '@/types/trips';

/**
 * Runs one proposal action at a time and exposes which one (by label) is in flight. A rejection
 * is rethrown to the caller, who owns reporting it; a call made while another runs does nothing
 * and resolves `false`.
 */
export function useProposalActionRunner() {
  const { isPending, run: runOne } = useAsyncAction();
  const [target, setTarget] = useState<string | null>(null);
  const run: ProposalActionRunner = async (label, action) => {
    const outcome = await runOne(() => {
      setTarget(label);
      return action();
    });
    if (outcome.status === 'error') throw outcome.error;
    return outcome.status === 'ok' && outcome.value;
  };
  return { pendingAction: isPending ? target : null, run };
}
