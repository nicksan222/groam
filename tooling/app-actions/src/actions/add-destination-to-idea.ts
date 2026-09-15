export type AddDestinationToIdeaInput = {
  countryCode?: string;
  label: string;
  latitude?: number;
  longitude?: number;
  name: string;
  notes: string;
  placeId?: string;
  tripId?: string;
};

export type AddDestinationToIdeaAction<Target> = (
  target: Target,
  input: AddDestinationToIdeaInput
) => Promise<void>;
