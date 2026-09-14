export type AddIdeaInput = {
  name: string;
  tripId?: string;
};

export type AddIdeaAction<Target> = (target: Target, input: AddIdeaInput) => Promise<string>;
