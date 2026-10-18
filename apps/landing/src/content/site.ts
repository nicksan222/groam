// Site map shared by the navigation, footer, features hub, and feature pages.

export type IconName =
  | 'agent'
  | 'arrow-right'
  | 'calendar'
  | 'chat'
  | 'check'
  | 'close'
  | 'idea'
  | 'issue'
  | 'menu'
  | 'pause'
  | 'play'
  | 'users';

export type Feature = {
  slug: 'itinerary' | 'ideas' | 'issues' | 'conversations' | 'ai';
  name: string;
  icon: IconName;
  /** One line for menus, cards, and related links. */
  summary: string;
  /** Page heading on the feature page. */
  headline: string;
  /** Page lede under the heading. */
  lede: string;
};

export const features: Feature[] = [
  {
    slug: 'itinerary',
    name: 'Live itinerary',
    icon: 'calendar',
    summary: 'One shared plan with every place, date, and activity.',
    headline: 'The plan everyone is looking at',
    lede: 'Destinations, dates, day-by-day activities, notes, and a trip cover in one itinerary. When it changes, it changes for the whole group.'
  },
  {
    slug: 'ideas',
    name: 'Ideas',
    icon: 'idea',
    summary: 'Suggest a change. The group reviews it before it lands.',
    headline: 'Suggest anything. The plan changes only when you apply it.',
    lede: 'Bundle your edits into an idea. The group looks it over and approves or asks for changes. The live plan stays put until someone applies it.'
  },
  {
    slug: 'issues',
    name: 'Issues',
    icon: 'issue',
    summary: 'Loose ends that close themselves when their idea is applied.',
    headline: 'Loose ends that close themselves',
    lede: 'Turn “someone should book dinner” into an issue the whole group can see. Link the idea that fixes it, and the issue closes when that idea is applied.'
  },
  {
    slug: 'conversations',
    name: 'Conversations',
    icon: 'chat',
    summary: "Group chat that lives inside the trip it's about.",
    headline: 'Talk it over right next to the plan',
    lede: "Every trip has its own conversations, with replies and reactions. The talk sits beside the plan it's about, so nobody scrolls back weeks to find a decision."
  },
  {
    slug: 'ai',
    name: 'AI agents',
    icon: 'agent',
    summary: "AI that knows the trip and the screen you're on.",
    headline: 'AI that knows which trip you mean',
    lede: 'Ask about the trip and whatever is on your screen. Get the itinerary reviewed, and let specialized agents help with ideas and issues.'
  }
];

export const featurePath = (slug: Feature['slug']) => `/features/${slug}/`;

export const primaryNav = [
  { label: 'Features', href: '/features/' },
  { label: 'Pricing', href: '/pricing/' }
] as const;

export const legalNav = [
  { label: 'Privacy', href: '/privacy/' },
  { label: 'Terms', href: '/terms/' }
] as const;
