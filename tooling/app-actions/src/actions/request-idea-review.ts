export type RequestIdeaReviewInput = {
  proposalId?: string;
};

export type RequestIdeaReviewAction<Actor> = (
  actor: Actor,
  input: RequestIdeaReviewInput
) => Promise<void>;
