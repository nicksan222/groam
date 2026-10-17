export type ResearchMessagePlan = { authorIndex: number; text: string };

export type ResearchPlan = {
  brief: string;
  key: string;
  messages: ResearchMessagePlan[];
  title: string;
};

const MAX_RESEARCH_TRIPS = 20;

/** Every other trip, capped, so small scenarios still get some and large ones stay quick. */
export function selectResearchTripIndexes(
  trips: ReadonlyArray<{ archived: boolean; known: boolean }>
): number[] {
  return trips
    .flatMap(({ archived, known }, index) => (!archived && known && index % 2 === 0 ? [index] : []))
    .slice(0, MAX_RESEARCH_TRIPS);
}

export function buildResearchPlans(city: string): ResearchPlan[] {
  return [
    {
      brief: `Collect the museums worth a visit in ${city}, with opening hours and any booking quirks.`,
      key: 'museums',
      title: `Museums in ${city}`,
      messages: [
        {
          authorIndex: 0,
          text: `Starting a shortlist of museums in ${city}. Add anything you have heard good things about.`
        },
        {
          authorIndex: 1,
          text: `This guide looks thorough: https://www.atlasobscura.com/things-to-do/${slug(city)}/museums`
        },
        {
          authorIndex: 2,
          text: 'I would pick two big ones at most. Museum fatigue is real by day three.'
        },
        {
          authorIndex: 3,
          text: 'Many are free or cheaper on the first Sunday of the month, worth checking against our dates.'
        },
        {
          authorIndex: 1,
          text: 'Agreed. I will book timed tickets for the top pick once the dates are settled.'
        }
      ]
    },
    {
      brief: `Where should the group eat in ${city}? Note price range, reservations and dietary fit.`,
      key: 'food',
      title: `Where to eat in ${city}`,
      messages: [
        { authorIndex: 2, text: `Where to eat in ${city}? I would love at least one long dinner.` },
        {
          authorIndex: 0,
          text: `Found a map of local favorites: https://www.google.com/maps/search/restaurants+${slug(city)}`
        },
        {
          authorIndex: 3,
          text: 'Two of us are vegetarian, so let us filter for places with real options, not just a salad.'
        },
        {
          authorIndex: 1,
          text: 'Good point. I would reserve dinner early, popular spots fill up days ahead.'
        }
      ]
    }
  ];
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-|-$/g, '');
}
