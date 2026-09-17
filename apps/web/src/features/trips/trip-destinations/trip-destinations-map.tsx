import { Button } from '@groam/ui/components/button';
import Shell from '@groam/ui/components/shell/client';
import { cn } from '@groam/ui/lib/utils';
import { useState } from 'react';
import MapView, { Layer, Marker, NavigationControl, Popup, Source } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  type Destination,
  destinationMapView,
  destinationRouteData
} from '@/features/trips/trip-destinations/trip-destinations-map-geometry';
import { tripMapStyle } from '@/features/trips/trip-destinations/trip-destinations-map-style';
import { testIds } from '@/lib/test-ids';

const mapStyle = tripMapStyle();

function primaryMapPaint(): string {
  return getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || 'green';
}

export function TripDestinationsMap({
  destinations,
  compact = false
}: {
  destinations: Destination[];
  compact?: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tilesFailed, setTilesFailed] = useState(false);
  const selected = destinations.find(({ id }) => id === selectedId);
  const routeKey = destinations.map(({ id }) => id).join(':') || 'empty-route';

  return (
    <Shell.Card
      className={cn(
        'relative overflow-hidden bg-muted',
        compact ? 'h-60 rounded-none border-x-0' : 'h-[22rem] sm:h-[28rem] xl:h-[36rem]'
      )}
      variant="well"
    >
      <MapView
        attributionControl={{ compact: true }}
        initialViewState={destinationMapView(destinations, compact ? 32 : 70)}
        key={routeKey}
        mapStyle={mapStyle}
        maxZoom={18}
        minZoom={-1}
        onError={() => setTilesFailed(true)}
        scrollZoom={false}
        reuseMaps
      >
        <NavigationControl position="top-right" showCompass={false} />
        {destinations.length > 1 && (
          <Source data={destinationRouteData(destinations)} id="trip-route" type="geojson">
            <Layer
              id="trip-route-line"
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              paint={{
                'line-color': primaryMapPaint(),
                'line-dasharray': [1.5, 1.5],
                'line-opacity': 0.8,
                'line-width': 4
              }}
              type="line"
            />
          </Source>
        )}
        {destinations.map((destination, index) => (
          <Marker
            anchor="bottom"
            key={destination.id}
            latitude={destination.latitude}
            longitude={destination.longitude}
          >
            <Button
              aria-label={`Show ${destination.name} on map`}
              className="grid size-9 place-items-center rounded-full border-2 border-background bg-primary text-sm font-bold text-primary-foreground"
              onClick={() => setSelectedId(destination.id)}
              type="button"
              unstyled
            >
              {index + 1}
            </Button>
          </Marker>
        ))}
        {selected && (
          <Popup
            anchor="bottom"
            closeOnClick={false}
            latitude={selected.latitude}
            longitude={selected.longitude}
            offset={42}
            onClose={() => setSelectedId(null)}
          >
            <div className="min-w-40 p-1 text-foreground">
              <p className="font-semibold">{selected.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {selected.startDay === null
                  ? 'Schedule not set'
                  : `Days ${selected.startDay}–${selected.endDay}`}
              </p>
            </div>
          </Popup>
        )}
      </MapView>
      {destinations.length > 0 && (
        <div className="pointer-events-none absolute left-3 top-3 rounded-full border border-border/60 bg-background/90 px-3 py-1 text-xs font-medium backdrop-blur">
          Interactive street map
        </div>
      )}
      {destinations.length === 0 && (
        <div className="absolute inset-0 grid place-items-center bg-muted/80 p-6 text-center backdrop-blur-sm">
          <div>
            <p className="font-medium">Your route will appear here</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add real places to turn this into a visual multi-stop trip.
            </p>
          </div>
        </div>
      )}
      {tilesFailed && destinations.length > 0 ? (
        <div
          className="pointer-events-none absolute inset-x-3 bottom-3 rounded-lg border border-border/60 bg-background/90 px-3 py-2 text-xs text-muted-foreground backdrop-blur"
          data-testid={testIds.tripMapOffline}
        >
          Map tiles are unavailable. Destinations still have coordinates; you can keep planning
          without the map.
        </div>
      ) : null}
    </Shell.Card>
  );
}
