import { Plus } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { testIds } from '@/lib/test-ids';
import { useTripBoardContext } from './trip-board-context';
import { TripBoardFooterLink } from './trip-board-footer-link';

/** Footer of To decide: add a card, or see every issue across trips. */
export function TripBoardIssuesFooter({ onNewIssue }: { onNewIssue: () => void }) {
  const { rights } = useTripBoardContext();
  return (
    <>
      {rights.archived ? null : (
        <Button data-testid={testIds.newIssue} onClick={onNewIssue} size="sm" variant="ghost">
          <Plus />
          New issue
        </Button>
      )}
      <TripBoardFooterLink section="issues" testId={testIds.issuesAll}>
        All issues
      </TripBoardFooterLink>
    </>
  );
}
