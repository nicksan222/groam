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
          text: `A map to investigate, not a vetted shortlist: https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`museums in ${city}`)}`
        },
        {
          authorIndex: 2,
          text: 'I would pick two big ones at most. Museum fatigue is real by day three.'
        },
        {
          authorIndex: 3,
          text: 'Before choosing: verify opening days, step-free routes, timed-entry tickets, and whether concessions apply on our actual dates. Do not assume a free-entry day.'
        },
        {
          authorIndex: 1,
          text: 'Decision still open: compare the strongest two options, keep one optional, and bring the cancellation terms back to the group before anyone pays.'
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
          text: 'Please check the menu and booking terms directly. Shortlist one inexpensive fallback in case the group changes plans; nothing is reserved yet.'
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
