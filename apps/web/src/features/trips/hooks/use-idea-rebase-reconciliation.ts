import { useState } from 'react';
import { useOpenState } from '@/features/workspace/hooks/use-open-state';
import type {
  IdeaRebaseChoice,
  IdeaRebaseConflict,
  IdeaRebaseResolution,
  IdeaRebaseResult
} from '@/types/trips';

export type { IdeaRebaseChoice, IdeaRebaseConflict, IdeaRebaseResolution, IdeaRebaseResult };

export function rebaseProgressLabel(stepIndex: number, total: number) {
  if (total === 0) return '';
  return `Change ${stepIndex + 1} of ${total}`;
}

export function rebaseBlockedReason(canRebase: boolean) {
  return canRebase ? null : 'Only the idea author or a group organizer can update this idea.';
}

export function rebaseExplanation(conflict: IdeaRebaseConflict) {
  const shared =
    conflict.currentFields.length > 0 ? conflict.currentFields.join(', ') : 'this item';
  const idea =
    conflict.proposedFields.length > 0 ? conflict.proposedFields.join(', ') : 'this item';
  if (shared === idea) {
    return `The shared trip and this idea both changed ${shared}.`;
  }
  return `The shared trip changed ${shared}. This idea changed ${idea}.`;
}

export function resolutionsFromChoices(
  conflicts: IdeaRebaseConflict[],
  choices: Record<string, IdeaRebaseChoice>
): IdeaRebaseResolution[] {
  return conflicts.map((conflict) => ({
    choice: choices[conflict.key] ?? 'current',
    path: conflict.key
  }));
}

export function useIdeaRebaseReconciliation() {
  const [choices, setChoices] = useState<Record<string, IdeaRebaseChoice>>({});
  const dialog = useOpenState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [steps, setSteps] = useState<IdeaRebaseConflict[]>([]);

  const current = steps[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = steps.length > 0 && stepIndex === steps.length - 1;

  const start = (conflicts: IdeaRebaseConflict[]) => {
    setSteps(conflicts);
    setStepIndex(0);
    setChoices({});
    dialog.openPanel();
  };

  const close = () => {
    dialog.closePanel();
    setSteps([]);
    setStepIndex(0);
    setChoices({});
  };

  const setChoice = (key: string, choice: IdeaRebaseChoice) => {
    setChoices((current) => ({ ...current, [key]: choice }));
  };

  const applyIfComplete = () => {
    if (steps.length === 0 || steps.some((step) => choices[step.key] === undefined)) {
      return { completed: false as const, resolutions: [] as IdeaRebaseResolution[] };
    }
    return {
      completed: true as const,
      resolutions: resolutionsFromChoices(steps, choices)
    };
  };

  const choose = (choice: IdeaRebaseChoice) => {
    if (!current) return { completed: false as const, resolutions: [] as IdeaRebaseResolution[] };
    const nextChoices = { ...choices, [current.key]: choice };
    setChoices(nextChoices);
    if (!isLast) {
      setStepIndex((index) => index + 1);
      return { completed: false as const, resolutions: [] as IdeaRebaseResolution[] };
    }
    return {
      completed: true as const,
      resolutions: resolutionsFromChoices(steps, nextChoices)
    };
  };

  const back = () => {
    if (!isFirst) setStepIndex((index) => index - 1);
  };

  return {
    applyIfComplete,
    back,
    choices,
    choose,
    close,
    current,
    currentChoice: current ? choices[current.key] : undefined,
    isFirst,
    isLast,
    open: dialog.open,
    progressLabel: rebaseProgressLabel(stepIndex, steps.length),
    setChoice,
    start,
    stepIndex,
    steps,
    total: steps.length
  };
}
