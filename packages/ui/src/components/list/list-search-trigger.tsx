import { ListFilter } from '@groam/icons';
import { ListControlButton } from './list-control-button';

/** Always-visible filter opener. K uses the same dialog through List.Search. */
export function ListSearchTrigger({ onClick }: { onClick: () => void }) {
  return (
    <ListControlButton
      aria-label="Filter"
      icon={ListFilter}
      label="Filter"
      onClick={onClick}
      shortcut="K"
    />
  );
}
