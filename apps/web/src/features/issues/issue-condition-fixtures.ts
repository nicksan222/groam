import type { IssueCondition } from '@/types/issues';

/** A starter decision as the server presents it: a locked one-clause rule. Test data only. */
export function starterCondition(
  met = false,
  refusal = met ? 'Settled by the trip.' : 'Closes once the trip has a destination.'
): Extract<IssueCondition, { kind: 'rule' }> {
  const label = 'The trip has a destination';
  return {
    items: [{ detail: met ? null : 'No destination yet', kind: 'clause', label, met }],
    kind: 'rule',
    label,
    match: 'all',
    met,
    refusal,
    rule: { items: [{ kind: 'has_destination' }], match: 'all' },
    starter: true
  };
}

/** A condition a person wrote: no check, no met state. Test data only. */
export function manualCondition(
  label = 'Flights confirmed'
): Extract<IssueCondition, { kind: 'manual' }> {
  return { kind: 'manual', label, met: null };
}

/** A person's own one-clause rule, editable and open to won't do. Test data only. */
export function ruleCondition(met = false): Extract<IssueCondition, { kind: 'rule' }> {
  const label = 'Planned costs fit the budget';
  return {
    items: [{ detail: null, kind: 'clause', label, met }],
    kind: 'rule',
    label,
    match: 'all',
    met,
    refusal: met ? 'Settled automatically.' : 'Closes once the trip meets its rule.',
    rule: { items: [{ kind: 'within_budget' }], match: 'all' },
    starter: false
  };
}
