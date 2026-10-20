import { seedDestinationAt, type SeedDestination } from './seed-destinations';

type Stop = readonly [name: string, latitude: number, longitude: number];

// Approximate map positions for illustrative local fixtures, not geocoder results.
const nearby: Record<string, readonly Stop[]> = {
  PT: [
    ['Sintra, Portugal', 38.8, -9.38],
    ['Cascais, Portugal', 38.7, -9.42]
  ],
  JP: [
    ['Nara, Japan', 34.68, 135.8],
    ['Osaka, Japan', 34.69, 135.5]
  ],
  MX: [
    ['Teotitlán del Valle, Mexico', 17.03, -96.52],
    ['San Pablo Villa de Mitla, Mexico', 16.92, -96.36]
  ],
  IS: [
    ['Hveragerði, Iceland', 64.0, -21.19],
    ['Selfoss, Iceland', 63.93, -21.0]
  ],
  MA: [
    ['Imlil, Morocco', 31.13, -7.92],
    ['Essaouira, Morocco', 31.51, -9.77]
  ],
  NZ: [
    ['Arrowtown, New Zealand', -44.94, 168.83],
    ['Wānaka, New Zealand', -44.7, 169.13]
  ],
  HR: [
    ['Trogir, Croatia', 43.52, 16.25],
    ['Šibenik, Croatia', 43.74, 15.9]
  ],
  CA: [
    ['Québec City, Canada', 46.81, -71.21],
    ['Trois-Rivières, Canada', 46.34, -72.55]
  ],
  TH: [
    ['Mae Rim, Thailand', 18.92, 98.94],
    ['Lamphun, Thailand', 18.58, 99.01]
  ],
  US: [
    ['Lafayette, Louisiana, USA', 30.22, -92.02],
    ['Baton Rouge, Louisiana, USA', 30.45, -91.19]
  ],
  ZA: [
    ['Stellenbosch, South Africa', -33.94, 18.86],
    ['Franschhoek, South Africa', -33.91, 19.12]
  ],
  NO: [
    ['Reine, Norway', 67.93, 13.09],
    ['Svolvær, Norway', 68.23, 14.57]
  ]
};

export function seedRegionalStops(index: number, count: number): SeedDestination[] {
  const home = seedDestinationAt(index);
  return (nearby[home.countryCode] ?? []).slice(0, count).map(([name, latitude, longitude]) => ({
    countryCode: home.countryCode,
    currency: home.currency,
    latitude,
    longitude,
    name,
    placeId: `seed:v2:${home.countryCode}:${name
      .split(',')[0]
      ?.toLowerCase()
      .replaceAll(/[^a-z0-9]+/g, '-')}`
  }));
}
