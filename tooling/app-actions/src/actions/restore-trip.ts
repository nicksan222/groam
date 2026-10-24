export type RestoreTripInput = {
  tripId?: string;
};

export type RestoreTripAction<Actor> = (actor: Actor, input: RestoreTripInput) => Promise<void>;
