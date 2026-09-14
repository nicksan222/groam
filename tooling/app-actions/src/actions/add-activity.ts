export type AddActivityInput = {
  address?: string;
  destination: string;
  destinationId?: string;
  notes?: string;
  title: string;
  tripId?: string;
};

export type AddActivityAction<Actor> = (actor: Actor, input: AddActivityInput) => Promise<void>;
