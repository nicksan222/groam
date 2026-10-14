import type { useTripIssue } from '@/features/trips/hooks/use-trip-issues';

// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
export type IssueDetailData = NonNullable<ReturnType<typeof useTripIssue>['issue']>;
