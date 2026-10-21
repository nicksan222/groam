export type PublisherContext = {
  isGitHubActions: boolean;
  repository: string;
  ref: string;
  eventName: string;
  sha: string;
};

/**
 * Only the trusted main-branch workflow may publish, on a main push or a manual release. The
 * preflight checks the credentials themselves.
 */
export function assertTrustedPublisher(context: PublisherContext): void {
  if (
    !context.isGitHubActions ||
    context.repository !== 'nicksan222/groam' ||
    context.ref !== 'refs/heads/main' ||
    !['push', 'workflow_dispatch'].includes(context.eventName) ||
    !/^[a-f0-9]{40}$/u.test(context.sha)
  )
    throw new Error(
      'Release publishing is restricted to the trusted main-branch GitHub Actions workflow.'
    );
}
