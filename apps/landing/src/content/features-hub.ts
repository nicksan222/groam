// Copy for the /features hub. Strings follow the copy deck.
import type { Feature } from '@/content/site';

export const hubTitle = 'Features';
export const hubDescription =
  'A itinerary, ideas the group approves, issues that close themselves, trip chat, and AI agents that know the trip. All in one place.';
export const hubHeadline = 'One place for the whole trip';
export const hubLede =
  'A live plan, ideas the group approves, issues that close themselves, chat beside the plan, and agents that know the trip.';
export const hubClosing =
  'Use one or use all five. Either way, the group ends up on the same page.';

export const hubBlurbs: Record<Feature['slug'], string> = {
  itinerary:
    'Places, dates, activities, notes, and a cover photo in one plan the whole group sees.',
  ideas: 'Suggest a change, let the group weigh in, and apply it when the group is ready.',
  issues: 'Write down what the trip still needs. It closes itself once its linked idea is applied.',
  conversations: 'Chat, replies, and reactions that stay with the trip they’re about.',
  ai: 'Ask about the trip, draft and revise ideas, work through issues, and review the plan.'
};
