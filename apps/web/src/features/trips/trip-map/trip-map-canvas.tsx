import { cn } from '@groam/ui/lib/utils';
import { useState } from 'react';
import MapView, { Layer, Marker, NavigationControl, Popup, Source } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { destinationMapView } from '@/features/trips/trip-destinations/trip-destinations-map-geometry';
import { tripMapStyle } from '@/features/trips/trip-destinations/trip-destinations-map-style';
import { testIds } from '@/lib/test-ids';
import type { MapStop } from '@/types/trips';
import { MapPillMarker } from './map-pill-marker';
import { dayHueVariable, legLabel, mapLegs, stopDaysLabel } from './trip-map-stops';

const mapStyle = tripMapStyle();

/** MapLibre paints cannot read CSS variables, so a leg's token is resolved to its current color. */
function resolveHue(variable: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(variable).trim() || 'gray';
}

/** The stops as pills joined by one line per leg, fitted to what is visible. Selecting a pill opens its popup. */
export function TripMapCanvas({ stops }: { stops: MapStop[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tilesFailed, setTilesFailed] = useState(false);
  const destinations = stops.map(({ destination }) => destination);
  const selected = stops.find(({ destination }) => destination.id === selectedId);
  const legs = mapLegs(stops);

  return (
    <>
      <MapView
        attributionControl={{ compact: true }}
        initialViewState={destinationMapView(destinations, 90)}
        key={stops.map(({ destination }) => destination.id).join(':') || 'empty'}
        mapStyle={mapStyle}
        maxZoom={18}
        minZoom={-1}
        onClick={() => setSelectedId(null)}
        onError={() => setTilesFailed(true)}
        reuseMaps
      >
        <NavigationControl position="top-right" showCompass={false} />
        <Source
          data={{
            features: legs.map(({ colorDay, id, line }) => ({
              geometry: { coordinates: line, type: 'LineString' as const },
              properties: { color: resolveHue(dayHueVariable(colorDay)) },
              id,
              type: 'Feature' as const
            })),
            type: 'FeatureCollection'
          }}
          id="trip-map-legs"
          type="geojson"
        >
          <Layer
            id="trip-map-leg-lines"
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            paint={{
              'line-color': ['get', 'color'],
              'line-dasharray': [1.5, 1.5],
              'line-opacity': 0.85,
              'line-width': 4
            }}
            type="line"
          />
        </Source>
        {stops.map((stop) => (
          <Marker
            anchor="center"
            key={stop.destination.id}
            latitude={stop.destination.latitude}
            longitude={stop.destination.longitude}
            onClick={(event) => event.originalEvent.stopPropagation()}
            style={{ zIndex: stop.destination.id === selectedId ? 2 : 1 }}
          >
            <MapPillMarker
              active={stop.destination.id === selectedId}
              onSelect={() => setSelectedId(stop.destination.id)}
              stop={stop}
            />
          </Marker>
        ))}
        {selected ? (
          <Popup
            anchor="bottom"
            closeOnClick={false}
            latitude={selected.destination.latitude}
            longitude={selected.destination.longitude}
            offset={22}
            onClose={() => setSelectedId(null)}
          >
            <div className="min-w-40 p-1 text-foreground">
              <p className="font-semibold">{selected.destination.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {stopDaysLabel(selected.destination)}
              </p>
              {legLabel(selected.destination.transferToNext) ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Next: {legLabel(selected.destination.transferToNext)}
                </p>
              ) : null}
            </div>
          </Popup>
        ) : null}
      </MapView>
      {tilesFailed ? (
        <div
          className={cn(
            'pointer-events-none absolute inset-x-3 top-16 rounded-lg border border-border/60',
            'bg-background/90 px-3 py-2 text-xs text-muted-foreground backdrop-blur'
          )}
          data-testid={testIds.tripMapOffline}
        >
          Map tiles are unavailable. The stops keep their places and days; you can keep planning
          without the map.
        </div>
      ) : null}
    </>
  );
}
