import { useState } from 'react';
import type { ProposalActionRunner } from '@/types/trips';

export function useProposalActionRunner() {
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const run: ProposalActionRunner = async (label, action) => {
    // oxlint-disable-next-line groam/no-hand-rolled-pending -- keyed by which action runs, and a rejection must reach the caller (useAsyncAction would swallow it)
    setPendingAction(label);
    try {
      return await action();
    } finally {
      setPendingAction(null);
    }
  };
  return { pendingAction, run };
}
