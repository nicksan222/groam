export type ArchiveTripInput = {
  tripId?: string;
};

export type ArchiveTripAction<Actor> = (actor: Actor, input: ArchiveTripInput) => Promise<void>;
