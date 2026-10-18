// Fictional example trips for the ribbon on the home page. None of these are real.

export const exampleTrips = [
  { name: 'Lisbon long weekend', state: '2 ideas open', tone: 'pink' },
  { name: 'Dolomites hut to hut', state: 'route approved', tone: 'green' },
  { name: 'Kyoto in cherry season', state: '1 issue left', tone: 'mauve' },
  { name: 'Porto with the cousins', state: 'plan agreed', tone: 'peach' },
  { name: 'Iceland Ring Road', state: 'day 6 in review', tone: 'sky' },
  { name: 'Amalfi birthday trip', state: 'dinner idea applied', tone: 'yellow' },
  { name: 'Berlin long weekend', state: '3 issues closed', tone: 'teal' },
  { name: 'Marrakech and the Atlas', state: 'train idea revised', tone: 'flamingo' },
  { name: 'Copenhagen by bike', state: '5 travelers in', tone: 'lavender' },
  { name: 'Highlands road trip', state: 'agent reviewing the route', tone: 'sapphire' },
  { name: 'Sicily family summer', state: 'ferry issue open', tone: 'rosewater' },
  { name: 'Vienna Christmas markets', state: 'new idea from Jonas', tone: 'blue' }
] as const;

export type TripTone = (typeof exampleTrips)[number]['tone'];
