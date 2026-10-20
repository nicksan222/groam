import { assistantAgents } from '@groam/ai/agents';
import { Bot, Lightbulb, ListChecks, UserRound } from '@groam/icons';
import { issueStatusMeta } from '@/features/issues/issue-status';
import { IssueStatusIcon } from '@/features/issues/shared/issue-status-icon';
import type { IssueEvent } from '@/types/issues';
import { IssueEventChip } from './issue-event-chip';

const agentNames = new Set(Object.values(assistantAgents).map(({ label }) => label));

function PersonChip({ name }: { name: string }) {
  const Icon = agentNames.has(name) ? Bot : UserRound;
  return (
    <IssueEventChip
      leading={<Icon aria-hidden className="size-3 shrink-0 text-muted-foreground" />}
    >
      {name}
    </IssueEventChip>
  );
}

function action(event: Exclude<IssueEvent, { kind: 'auto' }>) {
  switch (event.kind) {
    case 'status': {
      return (
        <>
          moved this to{' '}
          <IssueEventChip leading={<IssueStatusIcon className="size-3" status={event.status} />}>
            {issueStatusMeta[event.status].label}
          </IssueEventChip>
        </>
      );
    }
    case 'closed_by_idea': {
      return (
        <>
          closed this by applying{' '}
          <IssueEventChip
            leading={<Lightbulb aria-hidden className="size-3 shrink-0 text-muted-foreground" />}
          >
            {event.idea}
          </IssueEventChip>
        </>
      );
    }
    case 'assigned': {
      return (
        <>
          assigned <PersonChip name={event.name} />
        </>
      );
    }
    case 'unassigned': {
      return event.name === null ? (
        'unassigned this'
      ) : (
        <>
          unassigned <PersonChip name={event.name} />
        </>
      );
    }
    case 'condition_set': {
      return (
        <>
          set Done when to{' '}
          <IssueEventChip
            leading={<ListChecks aria-hidden className="size-3 shrink-0 text-muted-foreground" />}
          >
            {event.label}
          </IssueEventChip>
        </>
      );
    }
    case 'condition_removed': {
      return 'removed the Done when rule';
    }
  }
}

/**
 * One person's change as a sentence: their name, what they did, and what it touched as a chip.
 * Wording the timeline does not know stays as written.
 */
export function IssueEventLine({
  actorName,
  event,
  message
}: {
  actorName: string;
  event: Exclude<IssueEvent, { kind: 'auto' }> | null;
  message: string;
}) {
  if (!event) return <span className="text-foreground/70">{message}</span>;
  return (
    <>
      <span className="font-medium text-foreground">{actorName}</span> {action(event)}
    </>
  );
}
