import { env } from '@groam/env/web-client';

export function tripMapStyle(tileUrl = env.mapTilesUrl) {
  const carto = tileUrl.includes('cartocdn.com');
  return {
    layers: [{ id: 'street-map', source: 'street-map', type: 'raster' as const }],
    sources: {
      'street-map': {
        attribution: carto
          ? '© OpenStreetMap contributors · © CARTO'
          : '© OpenStreetMap contributors',
        maxzoom: 20,
        tileSize: 256,
        tiles: [tileUrl],
        type: 'raster' as const
      }
    },
    version: 8 as const
  };
}
