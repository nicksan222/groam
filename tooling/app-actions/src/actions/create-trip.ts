export type CreateTripInput = {
  dateNotes?: string;
  durationDays?: number;
  name: string;
};

export type CreateTripAction<Target> = (target: Target, input: CreateTripInput) => Promise<string>;
