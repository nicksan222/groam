import { statusChangeMessage, type TripIssueStatus } from '#convex/modules/travel/issues/status';

/**
 * What an issue's system comment records. Comments store the sentence, so the thread reads on its
 * own; `parseIssueEvent` reads it back so the timeline can show the parts.
 *
 * Pure so the web app can share the exact wording.
 */
export type IssueEvent =
  | { kind: 'status'; status: TripIssueStatus }
  | { idea: string; kind: 'closed_by_idea' }
  | { kind: 'assigned'; name: string }
  | { kind: 'unassigned'; name: string | null }
  | { kind: 'condition_set'; label: string }
  | { kind: 'condition_removed' }
  | { change: 'resolved' | 'reopened'; kind: 'auto'; label: string };

const STATUSES: TripIssueStatus[] = ['open', 'in_progress', 'closed', 'wont_do'];
const AUTO_RESOLVED = 'Resolved automatically: ';
const AUTO_REOPENED = 'Reopened automatically: ';
const NO_LONGER_HOLDS = ' no longer holds';
const CLOSED_BY_IDEA = 'closed this by applying ';
const ASSIGNED = 'assigned this to ';
const UNASSIGNED_THIS = 'unassigned this';
const UNASSIGNED = 'unassigned ';
const CONDITION_SET = 'set done when: ';
const CONDITION_REMOVED = 'removed the done-when condition';

/** The sentence after the actor's name, or the whole sentence for an automatic change. */
function eventText(event: IssueEvent): string {
  switch (event.kind) {
    case 'status': {
      return statusChangeMessage(event.status);
    }
    case 'closed_by_idea': {
      return `${CLOSED_BY_IDEA}${event.idea}`;
    }
    case 'assigned': {
      return `${ASSIGNED}${event.name}`;
    }
    case 'unassigned': {
      return event.name === null ? UNASSIGNED_THIS : `${UNASSIGNED}${event.name}`;
    }
    case 'condition_set': {
      return `${CONDITION_SET}${event.label}`;
    }
    case 'condition_removed': {
      return CONDITION_REMOVED;
    }
    case 'auto': {
      return event.change === 'resolved'
        ? `${AUTO_RESOLVED}${event.label}`
        : `${AUTO_REOPENED}${event.label}${NO_LONGER_HOLDS}`;
    }
  }
}

/** System-comment text for an event; a person's change starts with their name. */
export function issueEventMessage(actorName: string, event: IssueEvent): string {
  return event.kind === 'auto' ? eventText(event) : `${actorName} ${eventText(event)}`;
}

function parseAuto(message: string): IssueEvent | null {
  if (message.startsWith(AUTO_RESOLVED)) {
    return { change: 'resolved', kind: 'auto', label: message.slice(AUTO_RESOLVED.length) };
  }
  if (message.startsWith(AUTO_REOPENED) && message.endsWith(NO_LONGER_HOLDS)) {
    const label = message.slice(AUTO_REOPENED.length, -NO_LONGER_HOLDS.length);
    return { change: 'reopened', kind: 'auto', label };
  }
  return null;
}

function parseAction(text: string): IssueEvent | null {
  const status = STATUSES.find((candidate) => statusChangeMessage(candidate) === text);
  if (status) return { kind: 'status', status };
  if (text === UNASSIGNED_THIS) return { kind: 'unassigned', name: null };
  if (text === CONDITION_REMOVED) return { kind: 'condition_removed' };
  const prefixed = [
    [CLOSED_BY_IDEA, (rest: string): IssueEvent => ({ idea: rest, kind: 'closed_by_idea' })],
    [ASSIGNED, (rest: string): IssueEvent => ({ kind: 'assigned', name: rest })],
    [UNASSIGNED, (rest: string): IssueEvent => ({ kind: 'unassigned', name: rest })],
    [CONDITION_SET, (rest: string): IssueEvent => ({ kind: 'condition_set', label: rest })]
  ] as const;
  for (const [prefix, build] of prefixed) {
    if (text.startsWith(prefix) && text.length > prefix.length) {
      return build(text.slice(prefix.length));
    }
  }
  return null;
}

/** Reads `issueEventMessage` back; `null` for wording it does not know, such as older comments. */
export function parseIssueEvent(actorName: string, message: string): IssueEvent | null {
  const auto = parseAuto(message);
  if (auto) return auto;
  const prefix = `${actorName} `;
  return message.startsWith(prefix) ? parseAction(message.slice(prefix.length)) : null;
}
