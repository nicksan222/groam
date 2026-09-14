export type IssueAssignee =
  | { kind: 'agent' }
  | { kind: 'user'; name: string; userId: string }
  | null;

export type AssignIssueInput = {
  assignee: IssueAssignee;
  issueId?: string;
};

export type AssignIssueAction<Actor> = (actor: Actor, input: AssignIssueInput) => Promise<void>;
