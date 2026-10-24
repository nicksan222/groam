import {
  Coffee,
  Footprints,
  Landmark,
  Luggage,
  MapPin,
  Mountain,
  Music,
  ShoppingBag,
  Ticket,
  Utensils,
  Waves
} from '@groam/icons';
import type { Icon } from '@groam/icons';

/** First match wins, so "walk and cafe stop" is a walk and "market breakfast" a meal. */
const activityIcons: ReadonlyArray<readonly [RegExp, Icon]> = [
  [/\b(pack|unpack|luggage|bags?)\b/i, Luggage],
  [/\b(breakfast|brunch|lunch|dinner|meal|food|restaurant|tasting|taco|picnic)/i, Utensils],
  [/\b(caf[eé]|coffee|bar|drinks?|mezcal|wine)\b/i, Coffee],
  [/\b(hike|hiking|trek|mountain|summit|volcano|trail)/i, Mountain],
  [/\b(beach|swim|surf|snorkel|boat|kayak|lake|river|pool)/i, Waves],
  [
    /\b(museum|culture|gallery|church|cathedral|temple|ruins|monument|palace|castle|tour)/i,
    Landmark
  ],
  [/\b(concert|music|show|festival|theat(er|re)|dance)/i, Music],
  [/\b(shop|shopping|souvenir|crafts?)\b/i, ShoppingBag],
  [/\b(ticket|match|game|stadium)\b/i, Ticket],
  [/\b(walk|stroll|explore|wander|neighbou?rhood)/i, Footprints]
];

/** What an activity does, read from its title; a map pin when nothing fits. */
export function activityIcon(title: string): Icon {
  return activityIcons.find(([pattern]) => pattern.test(title))?.[1] ?? MapPin;
}
