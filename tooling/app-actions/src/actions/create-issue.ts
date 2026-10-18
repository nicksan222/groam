export type CreateIssueInput = {
  body: string;
  title: string;
  tripId?: string;
};

export type CreateIssueAction<Actor> = (actor: Actor, input: CreateIssueInput) => Promise<string>;
