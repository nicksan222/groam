import type { Infer } from 'convex/values';
import { type ConditionCheck, conditionMet } from '#convex/modules/travel/issues/checks';
import { presentRule, ruleLabel, type RuleFacts } from '#convex/modules/travel/issues/rules/index';
import { tripCheckPhrases } from '#convex/modules/travel/issues/rules/kinds/trip';
import type { TripIssueValidators } from '#convex/modules/travel/issues/schema';

export {
  type ConditionCheck,
  type ConditionFacts,
  conditionMet
} from '#convex/modules/travel/issues/checks';
export type { RuleFacts } from '#convex/modules/travel/issues/rules/index';

export type IssueCondition = Infer<typeof TripIssueValidators.condition>;
export type PresentedCondition = Infer<typeof TripIssueValidators.presentedCondition>;

const autoCopy: Record<ConditionCheck, { closesWhen: string; hint: string; label: string }> = {
  activities: {
    closesWhen: tripCheckPhrases.activities,
    hint: 'Start an idea that plans them.',
    label: 'Every destination has an activity'
  },
  budget: {
    closesWhen: tripCheckPhrases.budget,
    hint: 'Start an idea that sets it.',
    label: 'The trip has a group budget'
  },
  dates: {
    closesWhen: tripCheckPhrases.dates,
    hint: 'Start an idea that adds them.',
    label: 'The trip has travel dates'
  },
  destination: {
    closesWhen: tripCheckPhrases.destination,
    hint: 'Start an idea that picks one.',
    label: 'The trip has a destination'
  },
  duration: {
    closesWhen: tripCheckPhrases.duration,
    hint: 'Start an idea that sets it.',
    label: 'The trip has a length'
  },
  packing: {
    closesWhen: tripCheckPhrases.packing,
    hint: 'Start an idea that adds to it.',
    label: 'The packing list has items'
  },
  stays: {
    closesWhen: tripCheckPhrases.stays,
    hint: 'Start an idea that adds your stays.',
    label: 'Every night of the trip has a place to stay'
  }
};

export function conditionLabel(condition: IssueCondition): string {
  switch (condition.kind) {
    case 'auto': {
      return autoCopy[condition.check].label;
    }
    case 'manual': {
      return condition.text;
    }
    case 'rule': {
      return ruleLabel(condition.rule);
    }
  }
}

/** Whether the system decides the issue's status: the starter checks and composed rules. */
export function isCheckedCondition(
  condition: IssueCondition | undefined
): condition is Exclude<IssueCondition, { kind: 'manual' }> {
  return condition !== undefined && condition.kind !== 'manual';
}

/** Is a checked condition satisfied by the trip as it is now? */
export function checkedConditionMet(
  condition: Exclude<IssueCondition, { kind: 'manual' }>,
  facts: RuleFacts
): boolean {
  return condition.kind === 'auto'
    ? conditionMet(condition.check, facts)
    : presentRule(condition.rule, facts).met;
}

/**
 * Why a person cannot change an auto-condition issue's status by hand: while the condition is
 * unmet it cannot be closed, and once met it cannot be reopened.
 */
export function conditionRefusal(check: ConditionCheck, met: boolean): string {
  const { closesWhen, hint, label } = autoCopy[check];
  return met
    ? `Settled automatically: ${label}. Change the trip through an idea to reopen it.`
    : `This closes itself once ${closesWhen}. ${hint}`;
}

export function presentCondition(
  condition: IssueCondition | undefined,
  facts: RuleFacts
): PresentedCondition {
  if (!condition) return null;
  if (condition.kind === 'manual') return { kind: 'manual', label: condition.text, met: null };
  if (condition.kind === 'rule') return presentRule(condition.rule, facts);
  const met = conditionMet(condition.check, facts);
  return {
    check: condition.check,
    kind: 'auto',
    label: autoCopy[condition.check].label,
    met,
    refusal: conditionRefusal(condition.check, met)
  };
}
