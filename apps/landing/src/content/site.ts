// Site map shared by the navigation, footer, features hub, and feature pages.

import type { IconName } from '@groam/icons/names';

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
    name: 'Itinerary',
    icon: 'calendar',
    summary: 'One shared plan with every place, date, and activity.',
    headline: 'Everyone sees the same plan',
    lede: 'Destinations, dates, day-by-day activities, notes, and a trip cover in one itinerary. When it changes, it changes for the whole group.'
  },
  {
    slug: 'ideas',
    name: 'Ideas',
    icon: 'idea',
    summary: 'Suggest a change. The group reviews it before it lands.',
    headline: 'Suggest anything. Nothing moves until it’s applied.',
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
    name: 'Chat',
    icon: 'chat',
    summary: 'Group chat that lives inside the trip it’s about.',
    headline: 'Talk it over next to the plan',
    lede: 'Every trip has its own conversations, with replies and reactions. The talk sits beside the plan it’s about, so nobody scrolls back weeks to find a decision.'
  },
  {
    slug: 'ai',
    name: 'AI',
    icon: 'agent',
    summary: 'Ask, draft, revise, and review with agents that know the trip.',
    headline: 'Your trip. Your AI. Your say.',
    lede: 'Talk through the plan, draft an idea, change your mind, and work through loose ends. Meet the assistant and specialized agents that help you get there, with your own connected ChatGPT account.'
  }
];

export const featurePath = (slug: Feature['slug']) => `/features/${slug}/`;

export const primaryNav = [
  { label: 'Features', href: '/features/' },
  { label: 'AI', href: '/features/ai/' },
  { label: 'Pricing', href: '/pricing/' }
] as const;

export const legalNav = [
  { label: 'Privacy', href: '/privacy/' },
  { label: 'Terms', href: '/terms/' }
] as const;
