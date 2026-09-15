import type { AssistantScreen } from '#ai-contracts/agents/screen';

export type IssueStandaloneContext = {
  body: string;
  id: string;
  title: string;
  tripId: string;
  tripName: string;
};

export function issueStandalonePrompt(
  issue: Pick<IssueStandaloneContext, 'body' | 'title' | 'tripName'>
) {
  return [
    `You were assigned the trip issue "${issue.title}" on ${issue.tripName}.`,
    issue.body,
    'Start or reopen an idea, then implement the issue on that draft. Use the write tools that match the request: extend or reschedule stops, add update or remove activities and stays, add or remove destinations, set or remove transfers, and update trip details. Confirm what changed in your report.',
    'Do not create additional issues. Do not close this issue.'
  ].join('\n');
}

export function issueStandaloneScreen(
  issue: IssueStandaloneContext
): AssistantScreen & { target: { kind: 'trip'; section: 'issues'; tripId: string } } {
  return {
    capabilities: [],
    data: JSON.stringify({
      body: issue.body,
      issueId: issue.id,
      title: issue.title,
      tripName: issue.tripName
    }),
    description: 'Standalone Issue agent working this assigned trip issue.',
    key: `issue:${issue.id}:run`,
    target: { kind: 'trip', section: 'issues', tripId: issue.tripId },
    title: `${issue.tripName} · ${issue.title}`
  };
}
