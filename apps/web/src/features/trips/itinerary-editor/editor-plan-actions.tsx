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
  hasDestinations,
  onActivity,
  onStay,
  onTravel,
  onDestination
}: {
  hasDestinations: boolean;
  onActivity: () => void;
  onStay: () => void;
  onTravel: () => void;
  onDestination: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm">
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
