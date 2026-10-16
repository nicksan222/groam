import { Button } from '@groam/ui/components/button';
import { Plus } from 'lucide-react';
import { testIds } from '@/lib/test-ids';
import { TripBoardFooterLink } from './trip-board-footer-link';

/** Footer of To decide: add a card, or see every issue across trips. */
export function TripBoardIssuesFooter({ onNewIssue }: { onNewIssue: () => void }) {
  return (
    <>
      <Button data-testid={testIds.newIssue} onClick={onNewIssue} size="sm" variant="ghost">
        <Plus />
        New issue
      </Button>
      <TripBoardFooterLink section="issues" testId={testIds.issuesAll}>
        All issues
      </TripBoardFooterLink>
    </>
  );
}
