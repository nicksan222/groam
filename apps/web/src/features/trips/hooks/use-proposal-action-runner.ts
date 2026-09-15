import { useState } from 'react';
import type { ProposalActionRunner } from '@/types/trips';

export function useProposalActionRunner() {
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const run: ProposalActionRunner = async (label, action) => {
    setPendingAction(label);
    try {
      return await action();
    } finally {
      setPendingAction(null);
    }
  };
  return { pendingAction, run };
}
