export type PersonKey = 'daniel' | 'elena' | 'hannah' | 'priya' | 'tomas';

export type SeedStop = {
  countryCode: string;
  firstDay: number;
  lastDay: number;
  latitude: number;
  longitude: number;
  name: string;
  notes?: string;
  placeId: string;
};

export type SeedActivity = {
  block: 'afternoon' | 'evening' | 'full_day' | 'morning';
  day: number;
  notes?: string;
  stop: number;
  time?: readonly [start: string, end: string];
  title: string;
};

export type SeedResearch = {
  brief: string;
  issue?: string;
  key: string;
  messages: ReadonlyArray<{ by: PersonKey; text: string }>;
  title: string;
};

export type SeedTrip = {
  activities: readonly SeedActivity[];
  archived?: boolean;
  budget: number;
  currency: 'EUR' | 'GBP';
  dateNotes: string;
  idealDays: number;
  issues?: ReadonlyArray<{ body: string; title: string }>;
  key: string;
  minimumDays: number;
  name: string;
  proposal?: { notes: string; title: string };
  researches?: readonly SeedResearch[];
  startDate?: string;
  stops: readonly SeedStop[];
  totalDays: number;
};

export type SeedGroup = {
  members: readonly PersonKey[];
  name: string;
  owner: PersonKey;
  trips: readonly SeedTrip[];
};
