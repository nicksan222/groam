export type ApproveIdeaInput = {
  approved?: boolean;
  proposalId?: string;
};

export type ApproveIdeaAction<Actor> = (actor: Actor, input: ApproveIdeaInput) => Promise<void>;
