import { Button } from '@groam/ui/components/button';
import { Input } from '@groam/ui/components/input';
import { MenuRow } from '@groam/ui/components/menu-row';
import { Popover, PopoverContent, PopoverTrigger } from '@groam/ui/components/popover';
import { UserPlus } from 'lucide-react';
import { useState } from 'react';
import type { GearTraveler } from '@/types/packing';
import { PackingPersonAvatar } from './packing-person-avatar';

/** Past this many travelers the list gets a search box. */
const SEARCH_AFTER = 8;

/**
 * Picks a traveler to bring one of an item; the list closes once someone is chosen. With many
 * travelers it filters by name as you type.
 */
export function GroupGearPersonPicker({
  itemLabel,
  onPick,
  travelers
}: {
  itemLabel: string;
  onPick: (userId: string) => void;
  travelers: readonly GearTraveler[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchable = travelers.length > SEARCH_AFTER;
  const needle = query.trim().toLowerCase();
  const shown = needle
    ? travelers.filter((traveler) => traveler.name.toLowerCase().includes(needle))
    : travelers;
  return (
    <Popover
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery('');
      }}
      open={open}
    >
      <PopoverTrigger asChild>
        <Button
          aria-label={`Add a person to bring ${itemLabel}`}
          className="pointer-coarse:h-9"
          size="xs"
          type="button"
          variant="ghost"
        >
          <UserPlus />
          Add a person
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" aria-label={`Who brings ${itemLabel}`} className="w-64 p-1">
        {searchable ? (
          <Input
            aria-label="Search travelers"
            className="mb-1 h-8"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search travelers"
            value={query}
          />
        ) : null}
        {shown.length === 0 ? (
          <p className="px-2 py-3 text-center text-xs text-muted-foreground">
            No traveler matches &ldquo;{query.trim()}&rdquo;
          </p>
        ) : (
          <ul className="flex max-h-64 flex-col overflow-y-auto">
            {shown.map((traveler) => (
              <li key={traveler.userId}>
                <MenuRow
                  density="popover"
                  onClick={() => {
                    setOpen(false);
                    setQuery('');
                    onPick(traveler.userId);
                  }}
                >
                  <PackingPersonAvatar name={traveler.name} />
                  <span className="min-w-0 flex-1 truncate">{traveler.name}</span>
                </MenuRow>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
