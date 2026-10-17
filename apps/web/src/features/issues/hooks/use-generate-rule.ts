import { api } from '@groam/backend/api';
import { useAction } from 'convex/react';
import { useCallback } from 'react';
import { attemptValue } from '@/lib/errors';
import type { IssueRule } from '@/types/issues';

/**
 * Turns a sentence into a typed "done when" rule with the person's ChatGPT connection. Resolves
 * to the rule for the builder to show, or null after a toast; nothing is saved. The builder's
 * own working copy lives in `useRuleDraft`.
 */
export function useGenerateRule() {
  const draftAction = useAction(api.routes.trips.issues.rule.draft.run);
  return useCallback(
    async (text: string): Promise<IssueRule | null> => {
      const drafted = await attemptValue(
        () => draftAction({ text }),
        'Unable to turn that into a rule'
      );
      return drafted?.rule ?? null;
    },
    [draftAction]
  );
}
