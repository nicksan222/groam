export type IssueStatus = 'closed' | 'in_progress' | 'open' | 'wont_do';
export type IssueStatusFilter = 'all' | IssueStatus;

export type SetIssueStatusInput = {
  issueId?: string;
  status: IssueStatus;
};

export type SetIssueStatusAction<Actor> = (
  actor: Actor,
  input: SetIssueStatusInput
) => Promise<void>;
