import type { WorkspaceIssue } from './hooks/use-workspace-issues';

export function filterOpenIssues(issues: WorkspaceIssue[]) {
  return issues.filter((issue) => issue.status === 'open');
}

export function isIssuesIndexActive(pathname: string) {
  return pathname === '/issues' || pathname === '/issues/';
}

export function showEmptyIssuePortfolio(issueCount: number, canFetchMore: boolean) {
  return issueCount === 0 && !canFetchMore;
}
