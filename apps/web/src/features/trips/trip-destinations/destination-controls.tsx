import { Button } from '@groam/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@groam/ui/components/dropdown-menu';
import { Spinner } from '@groam/ui/components/spinner';
import { ArrowDown, ArrowUp, ArrowUpDown, Trash2 } from 'lucide-react';

export function DestinationControls({
  canManage,
  isMoving,
  isRemoving,
  name,
  nextName,
  onMove,
  onRemove,
  previousName
}: {
  canManage: boolean;
  isMoving: 'earlier' | 'later' | null;
  isRemoving: boolean;
  name: string;
  nextName: string | undefined;
  onMove: (direction: 'earlier' | 'later') => void;
  onRemove: () => void;
  previousName: string | undefined;
}) {
  if (!canManage) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={`Reorder or remove ${name}`}
          disabled={isMoving !== null || isRemoving}
          size="sm"
          type="button"
          variant="ghost"
        >
          {isMoving || isRemoving ? (
            <Spinner />
          ) : (
            <>
              <ArrowUpDown /> <span className="hidden sm:inline">Move</span>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuItem disabled={!previousName} onSelect={() => onMove('earlier')}>
          <ArrowUp /> Move before {previousName ?? 'previous stop'}
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!nextName} onSelect={() => onMove('later')}>
          <ArrowDown /> Move after {nextName ?? 'next stop'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onRemove} variant="destructive">
          <Trash2 /> Remove stop
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
