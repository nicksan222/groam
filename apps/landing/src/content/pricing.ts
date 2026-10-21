// Copy and example data for the pricing page and the home teaser.

export const pricingMeta = {
  title: 'Pricing',
  description:
    'Planning on your own is free. Each traveler you invite pays €1 for each trip they join. No subscription, no AI fee.'
} as const;

export const pricingIntro = {
  title: 'Free to\u00a0plan. €1\u00a0per traveler, per\u00a0trip.',
  lede: 'Plan on your own for free. Each invited traveler is €1 for each trip they join. They pay their own, or an organizer covers it. The trip creator’s place is free, and there’s no subscription.'
} as const;

export const plan = {
  heading: 'One price, for each trip',
  points: [
    {
      title: 'Planning on your own is free.',
      body: 'Create trips, build the itinerary, and use every feature. A solo trip costs nothing, and the trip creator never pays for their own place.'
    },
    {
      title: '€1 for each traveler who joins.',
      body: 'Each traveler pays their own €1 for the trip they join. Or you cover them from Travelers.'
    },
    {
      title: 'A new trip is a new €1.',
      body: 'Going again with the same friends? Each of them pays €1 for the new trip.'
    },
    {
      title: 'No subscription. No AI fee.',
      body: 'Nothing renews. AI features run on each traveler’s own ChatGPT account.'
    }
  ]
} as const;

export const example = {
  heading: 'A trip for four costs €3',
  paragraphs: [
    'Maya creates a long weekend in Lisbon and invites Jonas, Priya, and Sam. Maya is the trip creator, so her place is free. Jonas, Priya, and Sam pay €1 each. That’s 4 people on the trip for €3.',
    'The next spring, Maya plans Porto with Jonas and a new friend, Lena. Jonas and Lena pay €1 each again. That trip costs €2.'
  ]
} as const;

export const included = {
  heading: 'Everything, for everyone on the trip',
  items: [
    'A itinerary with destinations, dates, activities, notes, and a trip cover',
    'Ideas the group can inspect, approve, revise, and apply',
    'Issues that close when their linked idea is applied',
    'Trip conversations with replies and reactions',
    'AI help and specialized agents, using your own ChatGPT account',
    'Every feature for every traveler, on every trip'
  ]
} as const;

export const calculator = {
  heading: 'Work out your trip',
  invited: {
    label: 'Travelers you’re inviting',
    hint: 'Don’t count the trip creator. Their place is free. Press “I’ll pay” under a traveler to cover their\u00a0€1.'
  },
  footnote: 'Totals are per trip. Each traveler counts once they join.'
} as const;

/** Result copy for n invited travelers on one trip, `you` of whom the organizer covers. */
export function resultCopy(n: number, you = 0): { total: string; rest: string } {
  if (n <= 0) {
    return { total: '€0 for this trip.', rest: 'Just you on this trip, so it’s free.' };
  }
  const total = n === 1 ? '€1 for this trip.' : `€${n} for this trip.`;
  const own = n - you;
  const traveler = (count: number) => (count === 1 ? '1 traveler pays' : `${count} travelers pay`);
  if (you === 0) {
    return {
      total,
      rest: n === 1 ? '1 traveler pays their own €1.' : `${n} travelers pay their own €1.`
    };
  }
  if (own === 0) return { total, rest: n === 1 ? 'You pay the €1.' : `You pay all €${n}.` };
  return { total, rest: `You pay €${you}. ${traveler(own)} their own.` };
}

export const lane = {
  heading: 'Every trip, €1 per traveler',
  lede: 'The same friends, trip after trip. Each invited traveler is €1 for each trip they join, paid by them or covered by an organizer. The trip creator’s own place is free.',
  endcap: 'Every trip after that is €1 per traveler.'
} as const;

export const faq = {
  heading: 'Questions people ask',
  items: [
    {
      q: 'Is there a subscription?',
      a: 'No. Nothing renews monthly or yearly. Each traveler pays €1 for each trip they join, and that’s it.'
    },
    {
      q: 'Do I pay again for the same person on the next trip?',
      a: 'Yes, €1 per trip. Every trip is priced on its own, so going again with the same friends is €1 each again. A solo trip stays free.'
    },
    {
      q: 'Does every organizer get a free place?',
      a: 'Only the trip creator’s own place is free. Other organizers pay €1 per trip like other invited travelers, or another organizer covers them. A trip for four, including its creator, costs €3.'
    },
    {
      q: 'What about AI costs?',
      a: 'Groam doesn’t charge for AI. AI features run on the ChatGPT account each traveler connects in Settings → AI.'
    },
    {
      q: 'Who pays?',
      a: 'Each invited traveler pays their own €1, or an organizer covers them from Travelers. Create a trip and invite three friends without covering anyone: each pays €1, while your own place as the trip creator is free.'
    },
    {
      q: 'Can I pay for my friends?',
      a: 'Yes. Open Travelers and choose whose €1 to cover. It’s still €1 per traveler for the trip. You pick who pays, traveler by traveler.'
    },
    {
      q: 'What if someone never joins?',
      a: 'Only travelers who actually join the trip count. An invite nobody accepts costs nothing.'
    },
    {
      q: 'When do I pay?',
      a: 'On trips with payments enabled, pay €1 through Stripe Checkout before joining, or ask the organizer to cover you. Payments apply to every trip when enabled and are skipped when Stripe is not configured.'
    },
    {
      q: 'Do invited travelers get fewer features?',
      a: 'No. Everyone on a trip gets every feature.'
    }
  ]
} as const;

export const teaser = {
  heading: 'Free to\u00a0plan. €1\u00a0per traveler, per\u00a0trip.',
  free: { price: '€0', label: 'to plan, on your own' },
  paid: { price: '€1', label: 'per invited traveler, per trip' },
  example: 'A Lisbon trip for four costs €3, and a solo trip costs nothing.'
} as const;

/** Avatar palette classes exist globally for these names. */
export type Person = { id: string; initial: string; cls: string; name: string };

export const people: Person[] = [
  { id: 'maya', initial: 'M', cls: 'avatar-maya', name: 'Maya' },
  { id: 'jonas', initial: 'J', cls: 'avatar-jonas', name: 'Jonas' },
  { id: 'priya', initial: 'P', cls: 'avatar-priya', name: 'Priya' },
  { id: 'sam', initial: 'S', cls: 'avatar-sam', name: 'Sam' }
];

/** Example trips for the endless lane. Every invited traveler pays €1 on every trip they join. */
export type LaneTrip = {
  name: string;
  when: string;
  roster: { id: string; initial: string; state: 'organizer' | 'paid' }[];
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

/** One trip creator over six trips: the fare is €1 for each invited traveler, every time. */
export const laneTrips: LaneTrip[] = [
  {
    name: 'Lisbon long weekend',
    when: 'Year 1, autumn',
    roster: [org('maya'), paid('jonas'), paid('priya'), paid('sam')]
  },
  { name: 'Porto', when: 'Year 2, spring', roster: [org('maya'), paid('jonas'), paid('lena')] },
  { name: 'Solo in Seville', when: 'Year 2, autumn', roster: [org('maya')] },
  {
    name: 'Ski week',
    when: 'Year 3, winter',
    roster: [org('maya'), paid('jonas'), paid('priya'), paid('sam'), paid('noor')]
  },
  {
    name: 'Berlin',
    when: 'Year 3, summer',
    roster: [org('maya'), paid('jonas'), paid('lena'), paid('ravi')]
  },
  {
    name: 'Lake weekend',
    when: 'Year 3, autumn',
    roster: [org('maya'), paid('priya'), paid('sam'), paid('noor'), paid('ana')]
  }
];
