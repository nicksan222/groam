import type { ReleaseTarget } from '#src/release/target';

export type PublisherContext = {
  isGitHubActions: boolean;
  repository: string;
  ref: string;
  eventName: string;
  sha: string;
  keyDeploymentName: string | null;
  hasCloudflareToken?: boolean;
};

/**
 * Only the trusted main-branch workflow may publish: production on push or manual dispatch,
 * beta on manual dispatch only, each with the deploy key of its own Convex deployment.
 */
export function assertTrustedPublisher(target: ReleaseTarget, context: PublisherContext): void {
  if (
    !context.isGitHubActions ||
    context.repository !== 'nicksan222/groam' ||
    context.ref !== 'refs/heads/main' ||
    !(target.environment === 'beta'
      ? context.eventName === 'workflow_dispatch'
      : ['push', 'workflow_dispatch'].includes(context.eventName)) ||
    !/^[a-f0-9]{40}$/u.test(context.sha)
  )
    throw new Error(
      'Release publishing is restricted to the trusted main-branch GitHub Actions workflow.'
    );
  if (!context.hasCloudflareToken) throw new Error('Provide the Cloudflare API token.');
  if (context.keyDeploymentName !== target.deploymentName)
    throw new Error(
      'Provide a production-scoped CONVEX_DEPLOY_KEY matching the configured deployment.'
    );
}
