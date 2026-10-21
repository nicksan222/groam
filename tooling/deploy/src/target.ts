export type ProductionTarget = {
  convexUrl: string;
  siteUrl: string;
  appUrl: string;
  deploymentName: string;
};

function hostedOrigin(value: string, suffix: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Configure the production CONVEX_URL and SITE_URL first.');
  }
  if (
    url.protocol !== 'https:' ||
    !url.hostname.endsWith(suffix) ||
    url.username ||
    url.password ||
    url.port ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  )
    throw new Error(
      'Production URLs must be matching HTTPS Convex origins, without credentials, paths, queries, or fragments.'
    );
  return url;
}

export function productionTarget(convexUrl: string, siteUrl: string): ProductionTarget {
  const cloud = hostedOrigin(convexUrl, '.convex.cloud');
  const site = hostedOrigin(siteUrl, '.convex.site');
  const hostPrefix = cloud.hostname.slice(0, -'.convex.cloud'.length);
  const deploymentName = hostPrefix.split('.')[0] ?? '';
  if (
    !/^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z]{2}-[a-z]+-\d+)?$/u.test(hostPrefix) ||
    site.hostname !== `${hostPrefix}.convex.site`
  )
    throw new Error('CONVEX_URL and SITE_URL must identify the same production deployment.');
  return {
    convexUrl: cloud.origin,
    siteUrl: site.origin,
    appUrl: new URL('/app/', site).href,
    deploymentName
  };
}

export type PublisherContext = {
  isGitHubActions: boolean;
  repository: string;
  ref: string;
  eventName: string;
  sha: string;
  keyDeploymentName: string | null;
};

export function assertProductionPublisher(
  target: ProductionTarget,
  context: PublisherContext
): void {
  if (
    !context.isGitHubActions ||
    context.repository !== 'nicksan222/groam' ||
    context.ref !== 'refs/heads/main' ||
    !['push', 'workflow_dispatch'].includes(context.eventName) ||
    !/^[a-f0-9]{40}$/u.test(context.sha)
  )
    throw new Error(
      'Production publishing is restricted to the trusted main-branch GitHub Actions workflow.'
    );
  if (context.keyDeploymentName !== target.deploymentName)
    throw new Error(
      'Provide a production-scoped CONVEX_DEPLOY_KEY matching the configured deployment.'
    );
}

/** Clear local target selectors and credentials before invoking either frontend build. */
export function buildEnvironment(
  target: ProductionTarget,
  inherited: NodeJS.ProcessEnv
): NodeJS.ProcessEnv {
  const result = Object.fromEntries(
    Object.entries(inherited).filter(([key]) => !key.startsWith('CONVEX_'))
  );
  return {
    ...result,
    VITE_CONVEX_URL: target.convexUrl,
    VITE_CONVEX_SITE_URL: target.siteUrl,
    VITE_SITE_URL: target.appUrl,
    // The landing site is served from the root of the same origin, so the app links there.
    VITE_LANDING_URL: target.siteUrl,
    LANDING_SITE_URL: `${target.siteUrl}/`,
    STATIC_HOSTING_BASE_PATH: '/app/',
    ASTRO_TELEMETRY_DISABLED: '1'
  };
}
