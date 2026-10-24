export type UpdateTripInput = {
  budgetAmount?: number;
  dateNotes?: string;
  durationDays?: number;
  name?: string;
  tripId?: string;
};

export type UpdateTripAction<Actor> = (actor: Actor, input: UpdateTripInput) => Promise<void>;
