import type { ActionProps } from '#src/components/shell/types';
import type { ActionEntry } from './state';

export function selectOrderedActions(actions: ActionEntry[]): ActionProps[] {
  return actions
    .slice()
    .sort((left, right) => {
      const leftPosition = left.props.position;
      const rightPosition = right.props.position;
      if (typeof leftPosition === 'number' && typeof rightPosition === 'number') {
        return leftPosition - rightPosition;
      }
      if (typeof leftPosition === 'number') return -1;
      if (typeof rightPosition === 'number') return 1;
      return left.insertionIndex - right.insertionIndex;
    })
    .map((entry) => entry.props);
}
