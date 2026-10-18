export type SeedDestination = {
  countryCode: string;
  currency: 'CAD' | 'EUR' | 'ISK' | 'JPY' | 'MAD' | 'MXN' | 'NOK' | 'NZD' | 'THB' | 'USD' | 'ZAR';
  latitude: number;
  longitude: number;
  name: string;
  placeId: string;
};

const destinations = [
  {
    countryCode: 'PT',
    currency: 'EUR',
    latitude: 38.707_751,
    longitude: -9.136_592,
    name: 'Lisbon, Portugal',
    placeId: 'R:5400890'
  },
  {
    countryCode: 'JP',
    currency: 'JPY',
    latitude: 35.011_575,
    longitude: 135.768_144,
    name: 'Kyoto, Japan',
    placeId: 'R:358509'
  },
  {
    countryCode: 'MX',
    currency: 'MXN',
    latitude: 17.060_466,
    longitude: -96.725_357,
    name: 'Oaxaca, Mexico',
    placeId: 'R:159419'
  },
  {
    countryCode: 'IS',
    currency: 'ISK',
    latitude: 64.146_582,
    longitude: -21.942_635,
    name: 'Reykjavík, Iceland',
    placeId: 'R:2580605'
  },
  {
    countryCode: 'MA',
    currency: 'MAD',
    latitude: 31.634_602,
    longitude: -7.999_797,
    name: 'Marrakech, Morocco',
    placeId: 'R:302769'
  },
  {
    countryCode: 'NZ',
    currency: 'NZD',
    latitude: -45.031_162,
    longitude: 168.662_644,
    name: 'Queenstown, New Zealand',
    placeId: 'R:2094141'
  },
  {
    countryCode: 'HR',
    currency: 'EUR',
    latitude: 43.508_133,
    longitude: 16.440_193,
    name: 'Split, Croatia',
    placeId: 'R:1631965'
  },
  {
    countryCode: 'CA',
    currency: 'CAD',
    latitude: 45.501_887,
    longitude: -73.567_391,
    name: 'Montréal, Canada',
    placeId: 'R:1634158'
  },
  {
    countryCode: 'TH',
    currency: 'THB',
    latitude: 18.788_344,
    longitude: 98.985_3,
    name: 'Chiang Mai, Thailand',
    placeId: 'R:1906767'
  },
  {
    countryCode: 'US',
    currency: 'USD',
    latitude: 29.951_066,
    longitude: -90.071_532,
    name: 'New Orleans, USA',
    placeId: 'R:131885'
  },
  {
    countryCode: 'ZA',
    currency: 'ZAR',
    latitude: -33.924_869,
    longitude: 18.424_055,
    name: 'Cape Town, South Africa',
    placeId: 'R:1637127'
  },
  {
    countryCode: 'NO',
    currency: 'NOK',
    latitude: 68.208_812,
    longitude: 13.915_897,
    name: 'Lofoten, Norway',
    placeId: 'R:1059668'
  }
] as const satisfies readonly SeedDestination[];

export const seedDestinationCount = destinations.length;

export function seedDestinationAt(index: number): SeedDestination {
  const destination = destinations[index % destinations.length];
  if (!destination) throw new Error('No seed destinations are configured');
  return destination;
}
