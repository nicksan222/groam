import type { AssistantScreen } from '#ai/runtime/screen';

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
  // Write-tool choice and issue lifecycle rules come from the system
  // instructions (agent policies + tool guidance); only the task goes here.
  return [
    `You were assigned the trip issue "${issue.title}" on ${issue.tripName}.`,
    issue.body,
    'Start or reopen an idea, then implement the issue on that draft. Confirm what changed in your report.'
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
