export type ApplyIdeaInput = {
  proposalId?: string;
};

export type ApplyIdeaResult = 'applied' | 'conflicted';

export type ApplyIdeaAction<Actor> = (
  actor: Actor,
  input: ApplyIdeaInput
) => Promise<ApplyIdeaResult>;
