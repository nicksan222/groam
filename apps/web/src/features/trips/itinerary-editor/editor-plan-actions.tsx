import { Button } from '@groam/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@groam/ui/components/dropdown-menu';
import { BedDouble, CalendarDays, MapPin, Plus, Route } from 'lucide-react';

export function EditorPlanActions({
  disabled = false,
  hasDestinations,
  onActivity,
  onStay,
  onTravel,
  onDestination
}: {
  disabled?: boolean;
  hasDestinations: boolean;
  onActivity: () => void;
  onStay: () => void;
  onTravel: () => void;
  onDestination: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button disabled={disabled} size="sm" variant="outline">
          <Plus />
          Add a plan
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem disabled={!hasDestinations} onSelect={onActivity}>
          <CalendarDays />
          Activity
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!hasDestinations} onSelect={onStay}>
          <BedDouble />
          Stay
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!hasDestinations} onSelect={onTravel}>
          <Route />
          Travel
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onDestination}>
          <MapPin />
          Destination
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
