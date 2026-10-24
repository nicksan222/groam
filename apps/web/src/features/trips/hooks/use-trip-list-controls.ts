import { useTripCreateRequest } from '@/features/trips/hooks/use-trip-create-request';
import { useOpenState } from '@/features/workspace/hooks/use-open-state';

/** Desktop footer buttons and mobile shell actions open the same list dialogs. */
export function useTripListControls() {
  const searching = useOpenState(false);
  const sorting = useOpenState(false);
  useTripCreateRequest('search', searching.openPanel);
  useTripCreateRequest('sort', sorting.openPanel);
  return { searching, sorting };
}
