import type { ReactNode } from 'react';
import { Link } from '@/features/workspace/navigation/router';
import { useTripBoardContext } from './trip-board-context';

/** The quiet text link that closes a lane's footer, pushed to the right edge. */
export function TripBoardFooterLink({
  children,
  section,
  testId
}: {
  children: ReactNode;
  section: 'ideas' | 'issues';
  testId?: string;
}) {
  const { tripId } = useTripBoardContext();
  return (
    <Link
      className="ml-auto rounded-sm px-2 text-sm text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring"
      data-testid={testId}
      params={{ section, tripId }}
      to="/trips/$tripId/$section"
    >
      {children}
    </Link>
  );
}
