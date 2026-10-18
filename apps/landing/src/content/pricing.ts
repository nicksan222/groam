// Copy and example data for the pricing page and the home teaser.

export const pricingMeta = {
  title: 'Pricing',
  description:
    'Planning on your own is free. Each traveler you bring into a trip is €1, once, and then covered on every future trip. No subscription.'
} as const;

export const pricingIntro = {
  title: 'Free to plan. €1 per traveler, once.',
  lede: "Plan on your own for free. Each traveler you bring into a trip costs €1, one time. After that, they're covered on every future trip. There's no subscription."
} as const;

export const plan = {
  heading: 'One price, paid once per person',
  points: [
    {
      title: 'Planning on your own is free.',
      body: 'Create trips, build the itinerary, and use every feature. The person organizing never pays for themselves.'
    },
    {
      title: '€1 for each traveler you bring in.',
      body: 'Invite someone to a trip and they cost €1, one time.'
    },
    {
      title: 'Covered on every future trip.',
      body: 'You never pay for the same person twice.'
    },
    {
      title: 'No subscription. No AI fee.',
      body: "Nothing renews. AI features run on each traveler's own ChatGPT account."
    }
  ]
} as const;

export const example = {
  heading: 'A trip for four costs €3',
  paragraphs: [
    'Maya plans a long weekend in Lisbon and invites Jonas, Priya, and Sam. Maya is the organizer, so she plans free. Jonas, Priya, and Sam are €1 each. That’s 4 people on the trip for €3, paid once.',
    'The following spring, Maya plans Porto with Jonas and a new friend, Lena. Jonas is already covered. Lena is €1. That trip costs €1.'
  ]
} as const;

export const included = {
  heading: 'Everything, for everyone on the trip',
  items: [
    'A live itinerary with destinations, dates, activities, notes, and a trip cover',
    'Ideas the group can inspect, approve, revise, and apply',
    'Issues that close when their linked idea is applied',
    'Trip conversations with replies and reactions',
    'AI help and specialized agents, using your own ChatGPT account',
    "Every future trip for every traveler who's covered"
  ]
} as const;

export const calculator = {
  heading: 'Work out your trip',
  invited: {
    label: "Travelers you're inviting",
    hint: "Don't count yourself. Organizers plan free."
  },
  covered: {
    label: 'Already covered from an earlier trip',
    hint: 'People you’ve brought before cost nothing.'
  },
  footnote: 'Paid invites are coming soon. Nobody is charged today.'
} as const;

/** Result copy for n new (paying) travelers. */
export function resultCopy(n: number): { total: string; rest: string } {
  if (n <= 0) {
    return {
      total: '€0.',
      rest: "Everyone on this trip is already covered, or you're planning on your own."
    };
  }
  if (n === 1) return { total: '€1, paid once.', rest: '1 new traveler.' };
  return { total: `€${n}, paid once.`, rest: `${n} new travelers at €1 each.` };
}

export const faq = {
  heading: 'Questions people ask',
  items: [
    {
      q: 'Is there a subscription?',
      a: 'No. Nothing renews monthly or yearly. You pay €1 once for each traveler you bring in, and that’s it.'
    },
    {
      q: 'Do I pay again for the same person on the next trip?',
      a: "No. Once a traveler is covered, they're covered on every future trip."
    },
    {
      q: 'Does the organizer count as a traveler?',
      a: 'No. Planning on your own is free, so the person who starts the trip never pays for themselves. A trip for four, counting you, costs €3.'
    },
    {
      q: 'What about AI costs?',
      a: "Groam doesn't charge for AI. AI features run on the ChatGPT account each traveler connects in Settings → AI."
    },
    {
      q: 'Who pays?',
      a: 'The person who brings a traveler into the trip. If you invite three friends, the €3 is yours.'
    },
    {
      q: 'What if someone never joins?',
      a: 'You only pay for travelers who actually join the trip. An invite nobody accepts costs nothing.'
    },
    {
      q: 'When do I pay?',
      a: 'Not yet. Paid invites are coming soon, and nobody is charged for inviting travelers today. Plan and invite your group as usual.'
    },
    {
      q: 'Do invited travelers get fewer features?',
      a: 'No. Everyone on a trip gets every feature.'
    }
  ]
} as const;

export const teaser = {
  heading: 'Free to plan. €1 per traveler, once.',
  free: { price: '€0', label: 'to plan, on your own' },
  paid: { price: '€1', label: 'per traveler, once' },
  example:
    'A Lisbon trip for four costs €3, and the next trip with the same travelers costs nothing extra.'
} as const;

/** Avatar palette classes exist globally for these names. */
export type Person = { id: string; initial: string; cls: string; name: string };

export const people: Person[] = [
  { id: 'maya', initial: 'M', cls: 'avatar-maya', name: 'Maya' },
  { id: 'jonas', initial: 'J', cls: 'avatar-jonas', name: 'Jonas' },
  { id: 'priya', initial: 'P', cls: 'avatar-priya', name: 'Priya' },
  { id: 'sam', initial: 'S', cls: 'avatar-sam', name: 'Sam' }
];

/** Example trips for the endless lane. `paid: true` marks a traveler's first trip with us. */
export type LaneTrip = {
  name: string;
  when: string;
  roster: { id: string; initial: string; state: 'organizer' | 'paid' | 'covered' }[];
};

type Id = 'maya' | 'jonas' | 'priya' | 'sam' | 'lena' | 'noor' | 'ravi' | 'ana';
const init: Record<Id, string> = {
  maya: 'M',
  jonas: 'J',
  priya: 'P',
  sam: 'S',
  lena: 'L',
  noor: 'N',
  ravi: 'R',
  ana: 'A'
};
const org = (id: Id) => ({ id, initial: init[id], state: 'organizer' as const });
const paid = (id: Id) => ({ id, initial: init[id], state: 'paid' as const });
const cov = (id: Id) => ({ id, initial: init[id], state: 'covered' as const });

/** One group over six trips: the covered set only grows, so nobody pays twice. */
export const laneTrips: LaneTrip[] = [
  {
    name: 'Lisbon long weekend',
    when: 'Year 1, autumn',
    roster: [org('maya'), paid('jonas'), paid('priya'), paid('sam')]
  },
  { name: 'Porto', when: 'Year 2, spring', roster: [org('maya'), cov('jonas'), paid('lena')] },
  {
    name: 'Ski week',
    when: 'Year 3, winter',
    roster: [org('maya'), cov('jonas'), cov('priya'), cov('sam'), paid('noor')]
  },
  {
    name: 'Berlin',
    when: 'Year 3, summer',
    roster: [org('maya'), cov('jonas'), cov('lena'), paid('ravi')]
  },
  {
    name: 'Lake weekend',
    when: 'Year 3, autumn',
    roster: [org('maya'), cov('priya'), cov('sam'), cov('noor'), paid('ana')]
  },
  {
    name: 'Lisbon again',
    when: 'Year 4, spring',
    roster: [org('maya'), cov('jonas'), cov('priya'), cov('sam'), cov('lena'), cov('ravi')]
  }
];
