// Copy for the /features hub. Strings follow the copy deck.
import type { Feature } from '@/content/site';

export const hubTitle = 'Features';
export const hubDescription =
  'A live itinerary, ideas the group approves, issues that close themselves, trip chat, and AI agents that know the trip. All in one place.';
export const hubHeadline = 'Everything a group trip needs, in one place';
export const hubLede =
  "One live plan, a way to suggest changes without breaking it, loose ends that close themselves, chat that stays with the trip, and AI that knows what you're looking at.";
export const hubClosing =
  'Each one works on its own. Together they take a trip from a vague idea to a plan the group agreed on.';

export const hubBlurbs: Record<Feature['slug'], string> = {
  itinerary:
    'Places, dates, activities, notes, and a cover photo in one plan the whole group sees.',
  ideas: 'Suggest a change, let the group weigh in, and apply it when the group is ready.',
  issues: 'Write down what the trip still needs. It closes itself once its linked idea is applied.',
  conversations: "Chat, replies, and reactions that stay with the trip they're about.",
  ai: "Ask about the trip or the screen you're on, and get the itinerary reviewed."
};
