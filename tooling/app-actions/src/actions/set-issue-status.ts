export type IssueStatus = 'closed' | 'open';

export type SetIssueStatusInput = {
  issueId?: string;
  status: IssueStatus;
};

export type SetIssueStatusAction<Actor> = (
  actor: Actor,
  input: SetIssueStatusInput
) => Promise<void>;
