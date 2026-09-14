import { describe, expect, test } from 'vitest';
import { tripMapStyle } from './trip-destinations-map-style';

describe('tripMapStyle', () => {
  test('uses CARTO attribution for the default Voyager tiles', () => {
    const style = tripMapStyle('https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png');
    expect(style.sources['street-map'].attribution).toContain('CARTO');
    expect(style.sources['street-map'].tiles).toEqual([
      'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png'
    ]);
  });

  test('drops CARTO attribution for self-hosted OSM tiles', () => {
    const style = tripMapStyle('https://tile.openstreetmap.org/{z}/{x}/{y}.png');
    expect(style.sources['street-map'].attribution).toBe('© OpenStreetMap contributors');
    expect(style.sources['street-map'].tiles[0]).toContain('openstreetmap.org');
  });
});
