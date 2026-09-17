import { Badge } from '@groam/ui/components/badge';
import { Button } from '@groam/ui/components/button';
import { DashedEmpty } from '@groam/ui/components/dashed-empty';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@groam/ui/components/dialog';
import { ErrorWell } from '@groam/ui/components/error-well';
import { Input } from '@groam/ui/components/input';
import { LoadingPlaceholder } from '@groam/ui/components/loading-placeholder';
import { ScrollArea } from '@groam/ui/components/scroll-area';
import { SelectRow } from '@groam/ui/components/select-row';
import { ChevronDown, Compass, MapPin, Search, Sparkles } from 'lucide-react';
import { useTripDestinationSearch } from '@/features/trips/hooks/use-trip-destination-search';
import type { TripLocation } from '@/features/trips/trip-location';
import { testIds } from '@/lib/test-ids';

function SearchResult({
  location,
  onSelect,
  selected
}: {
  location: TripLocation;
  onSelect: (location: TripLocation) => void;
  selected: boolean;
}) {
  return (
    <SelectRow
      data-place-name={location.name}
      data-testid={testIds.destinationSearchResult}
      icon={
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10">
          <MapPin className="size-5 text-primary" />
        </span>
      }
      onSelect={() => onSelect(location)}
      selected={selected}
      subtitle={[location.type, location.context].filter(Boolean).join(' · ')}
      title={location.name}
    />
  );
}

function SearchState({
  error,
  isLoading,
  query
}: {
  error: string | null;
  isLoading: boolean;
  query: string;
}) {
  if (isLoading) {
    return <LoadingPlaceholder className="min-h-40" label="Searching real places…" />;
  }
  if (error) {
    return <ErrorWell>{error}</ErrorWell>;
  }
  return (
    <DashedEmpty
      className="grid min-h-40 place-items-center rounded-xl p-6"
      icon={Compass}
      iconClassName="text-primary/50"
      title={query.trim().length < 2 ? 'Search anywhere in the world' : 'No matching places found'}
    >
      Try a city, landmark, region, island, or country.
    </DashedEmpty>
  );
}

export function TripDestinationPicker({
  disabled,
  id,
  onChange,
  status,
  value
}: {
  disabled: boolean;
  id?: string;
  onChange: (status: 'known' | 'undecided', destination: TripLocation | null) => void;
  status: 'known' | 'undecided';
  value: TripLocation | null;
}) {
  const { closeAndClear, error, isLoading, isOpen, onOpenChange, open, query, results, setQuery } =
    useTripDestinationSearch();

  const select = (location: TripLocation) => {
    onChange('known', location);
    closeAndClear();
  };

  return (
    <>
      <Button
        aria-haspopup="dialog"
        className="flex min-h-14 w-full items-center gap-3 rounded-lg border border-input bg-background px-3 py-2 text-left transition-colors hover:border-primary/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        data-testid={testIds.addStopPlace}
        disabled={disabled}
        id={id}
        onClick={open}
        type="button"
        unstyled
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10">
          {status === 'known' ? (
            <MapPin className="size-4 text-primary" />
          ) : (
            <Compass className="size-4 text-primary" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">
            {status === 'known' && value ? value.name : 'Keep the destination open'}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {status === 'known'
              ? 'Verified place · click to change'
              : 'Search real cities, landmarks, regions, and countries'}
          </span>
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </Button>

      <Dialog onOpenChange={onOpenChange} open={isOpen}>
        <DialogContent
          className="max-h-[90dvh] overflow-hidden p-0 sm:max-w-2xl"
          data-testid={testIds.destinationSearch}
        >
          <DialogHeader className="border-b border-border/40 px-6 pb-4 pt-6 pr-12">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="size-4" />
              <Badge variant="outline">Global place search</Badge>
            </div>
            <DialogTitle>Where could this trip take you?</DialogTitle>
            <DialogDescription>
              Search OpenStreetMap places. If search is offline, you can keep planning and add
              destinations later.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search destinations"
                className="h-11 pl-9"
                data-testid={testIds.destinationSearchInput}
                maxLength={120}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Try Tokyo, Eiffel Tower, Mallorca…"
                value={query}
              />
            </div>
          </div>
          <ScrollArea className="h-[min(28rem,55dvh)] px-6">
            <div className="space-y-2 pb-5">
              <SelectRow
                className="border-dashed border-primary/30 bg-primary/5 hover:border-primary/60 hover:bg-primary/10"
                data-testid={testIds.destinationUndecided}
                icon={
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-background">
                    <Compass className="size-5 text-primary" />
                  </span>
                }
                onSelect={() => {
                  onChange('undecided', null);
                  closeAndClear();
                }}
                selected={status === 'undecided'}
                subtitle="No destination yet"
                title="Let the group decide"
              />
              {results.map((location) => (
                <SearchResult
                  key={location.placeId}
                  location={location}
                  onSelect={select}
                  selected={value?.placeId === location.placeId}
                />
              ))}
              {results.length === 0 && (
                <SearchState error={error} isLoading={isLoading} query={query} />
              )}
            </div>
          </ScrollArea>
          <p className="border-t border-border/40 px-6 py-3 text-center text-[11px] text-muted-foreground">
            © OpenStreetMap contributors · Photon geocoding
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
