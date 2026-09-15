import type { useTripIssue } from '@/features/trips/hooks/use-trip-issues';

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
export type IssueDetailData = NonNullable<ReturnType<typeof useTripIssue>['issue']>;
