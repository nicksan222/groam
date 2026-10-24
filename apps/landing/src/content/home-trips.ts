// Fictional example trips for the ribbon on the home page. None of these are real.

export const exampleTrips = [
  { name: 'Lisbon long weekend', state: '2 ideas open', tone: 'maya' },
  { name: 'Dolomites hut to hut', state: 'route approved', tone: 'jonas' },
  { name: 'Kyoto in cherry season', state: '1 issue left', tone: 'priya' },
  { name: 'Porto with the cousins', state: 'plan agreed', tone: 'sam' },
  { name: 'Iceland Ring Road', state: 'day 6 in review', tone: 'maya' },
  { name: 'Amalfi birthday trip', state: 'dinner idea applied', tone: 'jonas' },
  { name: 'Berlin long weekend', state: '3 issues closed', tone: 'priya' },
  { name: 'Marrakech and the Atlas', state: 'train idea revised', tone: 'sam' },
  { name: 'Copenhagen by bike', state: '5 travelers in', tone: 'maya' },
  { name: 'Highlands road trip', state: 'agent reviewing the route', tone: 'jonas' },
  { name: 'Sicily family summer', state: 'ferry issue open', tone: 'priya' },
  { name: 'Vienna Christmas markets', state: 'new idea from Jonas', tone: 'sam' }
] as const;

export type TripTone = (typeof exampleTrips)[number]['tone'];
