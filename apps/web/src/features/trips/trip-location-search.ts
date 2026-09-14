import { env } from '@groam/env/web-client';
import type { TripLocation } from './trip-location';

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
type JsonObject = Record<string, unknown>;

function object(value: unknown): JsonObject | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as JsonObject)
    : null;
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function osmIdentifier(value: unknown): string | undefined {
  if (typeof value === 'string') return text(value);
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
    ? String(value)
    : undefined;
}

function placeType(properties: JsonObject): string {
  const value = text(properties.osm_value) ?? text(properties.type) ?? 'place';
  return value.replace(/_/gu, ' ').replace(/^./u, (character: string) => character.toUpperCase());
}

function locationName(properties: JsonObject): { context: string; name: string } | null {
  const primary = text(properties.name);
  if (!primary) return null;
  const candidates = [
    text(properties.city),
    text(properties.district),
    text(properties.state),
    text(properties.country)
  ];
  const seen = new Set([primary.toLocaleLowerCase()]);
  const context = candidates.filter((candidate): candidate is string => {
    if (!candidate || seen.has(candidate.toLocaleLowerCase())) return false;
    seen.add(candidate.toLocaleLowerCase());
    return true;
  });
  const conciseContext = context.length > 2 ? [context[0], context[context.length - 1]] : context;
  return {
    context: conciseContext.filter((value): value is string => value !== undefined).join(', '),
    name: [primary, ...conciseContext].filter(Boolean).join(', ')
  };
}

function validCoordinates(value: unknown): { latitude: number; longitude: number } | null {
  if (!Array.isArray(value)) return null;
  const [longitude, latitude] = value;
  if (
    typeof longitude !== 'number' ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180 ||
    typeof latitude !== 'number' ||
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90
  ) {
    return null;
  }
  return { latitude, longitude };
}

function locationResult(candidate: unknown): TripLocation | null {
  const feature = object(candidate);
  const properties = object(feature?.properties);
  const geometry = object(feature?.geometry);
  const coordinates = validCoordinates(geometry?.coordinates);
  const id = osmIdentifier(properties?.osm_id);
  const osmType = text(properties?.osm_type);
  const label = properties ? locationName(properties) : null;
  if (!properties || !label || !coordinates || !id || !osmType) return null;

  const countryCode = text(properties.countrycode)?.toUpperCase();
  return {
    context: label.context,
    ...(countryCode ? { countryCode } : {}),
    ...coordinates,
    name: label.name,
    placeId: `${osmType}:${id}`,
    type: placeType(properties)
  };
}

export function parseLocationResults(value: unknown): TripLocation[] {
  const root = object(value);
  if (!root || !Array.isArray(root.features)) return [];
  const locations: TripLocation[] = [];
  const seen = new Set<string>();
  for (const candidate of root.features) {
    const location = locationResult(candidate);
    if (!location || seen.has(location.placeId)) continue;
    seen.add(location.placeId);
    locations.push(location);
  }
  return locations;
}

export function photonSearchUrl(query: string, photonUrl = env.photonUrl): URL {
  const base = new URL(photonUrl);
  if (
    (base.protocol !== 'http:' && base.protocol !== 'https:') ||
    base.username !== '' ||
    base.password !== ''
  ) {
    throw new Error('Place search is unavailable.');
  }
  const url = new URL(base);
  if (url.pathname === '/' || url.pathname === '') url.pathname = '/api/';
  url.searchParams.set('q', query);
  url.searchParams.set('limit', '10');
  url.searchParams.set('lang', 'en');
  if (url.origin !== base.origin) {
    throw new Error('Place search is unavailable.');
  }
  return url;
}

export async function searchLocations(query: string, signal: AbortSignal): Promise<TripLocation[]> {
  const url = photonSearchUrl(query);
  let response: Response;
  try {
    // fallow-ignore-next-line security-sink -- Photon origin is env-validated; query is only a search param
    response = await fetch(url, {
      headers: { Accept: 'application/geo+json, application/json' },
      redirect: 'error',
      signal
    });
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new Error(
      'Place search is unavailable offline. You can keep planning, or run a local Photon geocoder.'
    );
  }
  if (!response.ok) throw new Error(`Location search failed (${response.status})`);
  return parseLocationResults(await response.json());
}
