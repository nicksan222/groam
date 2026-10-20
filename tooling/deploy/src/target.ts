export type ProductionTarget = {
  convexUrl: string;
  siteUrl: string;
  backendSiteUrl: string;
  appUrl: string;
  deploymentName: string;
  cloudflareAccountId: string;
  cloudflareWorkerName: string;
};

function hostedOrigin(value: string, suffix = ''): URL {
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
      'Production URLs must be HTTPS origins, without credentials, paths, queries, or fragments.'
    );
  return url;
}

export function productionTarget(
  convexUrl: string,
  siteUrl: string,
  cloudflareAccountId = '',
  cloudflareWorkerName = 'groam'
): ProductionTarget {
  if (
    (cloudflareAccountId && !/^[a-f0-9]{32}$/u.test(cloudflareAccountId)) ||
    !/^[a-z][a-z0-9-]{0,62}$/u.test(cloudflareWorkerName)
  )
    throw new Error('Configure a valid Cloudflare account ID and Worker name.');
  const cloud = hostedOrigin(convexUrl, '.convex.cloud');
  const site = hostedOrigin(siteUrl);
  const hostPrefix = cloud.hostname.slice(0, -'.convex.cloud'.length);
  const deploymentName = hostPrefix.split('.')[0] ?? '';
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z]{2}-[a-z]+-\d+)?$/u.test(hostPrefix))
    throw new Error('CONVEX_URL and SITE_URL must identify the same production deployment.');
  return {
    convexUrl: cloud.origin,
    siteUrl: site.origin,
    backendSiteUrl: `https://${hostPrefix}.convex.site`,
    appUrl: new URL('/app/', site).href,
    deploymentName,
    cloudflareAccountId,
    cloudflareWorkerName
  };
}

export type PublisherContext = {
  isGitHubActions: boolean;
  repository: string;
  ref: string;
  eventName: string;
  sha: string;
  keyDeploymentName: string | null;
  hasCloudflareToken?: boolean;
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
  if (!target.cloudflareAccountId || !context.hasCloudflareToken)
    throw new Error('Provide the Cloudflare account ID and production API token.');
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
    Object.entries(inherited).filter(
      ([key]) => !key.startsWith('CONVEX_') && !key.startsWith('CLOUDFLARE_')
    )
  );
  return {
    ...result,
    VITE_CONVEX_URL: target.convexUrl,
    VITE_CONVEX_SITE_URL: target.backendSiteUrl,
    VITE_SITE_URL: target.appUrl,
    LANDING_SITE_URL: `${target.siteUrl}/`,
    STATIC_HOSTING_BASE_PATH: '/app/',
    ASTRO_TELEMETRY_DISABLED: '1'
  };
}
