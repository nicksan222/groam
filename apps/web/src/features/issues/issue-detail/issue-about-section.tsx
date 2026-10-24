import { DetailSection } from '@groam/ui/components/detail-section';
import { Link } from '@/features/workspace/navigation/router';
import { testIds } from '@/lib/test-ids';
import type { IssueDetailData } from './issue-detail-data';

/** The plan item the issue was raised about, linking to its day on Plan; hidden once it is gone. */
export function IssueAboutSection({
  compact,
  issue
}: {
  compact?: boolean;
  issue: IssueDetailData;
}) {
  const { about } = issue;
  if (!about && !issue.subjectMissing) return null;
  return (
    <DetailSection compact={compact} title="About">
      {!about ? (
        <p className="text-xs text-muted-foreground" data-testid={testIds.issueAbout}>
          No longer on the plan
        </p>
      ) : (
        <Link
          className="text-sm font-medium hover:underline"
          data-testid={testIds.issueAbout}
          params={{ section: 'plan', tripId: issue.tripId }}
          search={about.day === null ? undefined : { day: about.day }}
          to="/trips/$tripId/$section"
        >
          {about.label}
        </Link>
      )}
    </DetailSection>
  );
}
