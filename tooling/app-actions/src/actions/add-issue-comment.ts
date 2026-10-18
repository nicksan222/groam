export type AddIssueCommentInput = {
  content: string;
  issueId?: string;
};

export type AddIssueCommentAction<Actor> = (
  actor: Actor,
  input: AddIssueCommentInput
) => Promise<void>;
