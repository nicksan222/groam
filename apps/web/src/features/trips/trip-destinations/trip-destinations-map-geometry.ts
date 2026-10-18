import type { Destination } from '@/types/trips';

export type { Destination };

export function destinationRouteData(destinations: Destination[]) {
  return {
    geometry: {
      coordinates: destinations.map(({ latitude, longitude }) => [longitude, latitude]),
      type: 'LineString' as const
    },
    properties: {},
    type: 'Feature' as const
  };
}

export function destinationMapView(destinations: Destination[], padding = 70) {
  if (destinations.length === 0) return { latitude: 20, longitude: 0, zoom: 1.2 };
  const longitudes = destinations.map(({ longitude }) => longitude);
  const latitudes = destinations.map(({ latitude }) => latitude);
  if (destinations.length === 1) {
    return { latitude: latitudes[0] ?? 20, longitude: longitudes[0] ?? 0, zoom: 8 };
  }
  return {
    bounds: [
      [Math.min(...longitudes), Math.min(...latitudes)],
      [Math.max(...longitudes), Math.max(...latitudes)]
    ] as [[number, number], [number, number]],
    fitBoundsOptions: { padding }
  };
}
