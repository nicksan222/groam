import type { Environment, FrontendApp, ReleaseEnvironment } from '#src/environments';

/** Validated destinations for one release, derived from the committed environment settings. */
export type ReleaseTarget = {
  environment: ReleaseEnvironment;
  workers: Record<FrontendApp, string>;
  convexUrl: string;
  /** The web app's origin; Convex SITE_URL and the passkey relying party use it too. */
  siteUrl: string;
  landingUrl: string;
  backendSiteUrl: string;
  deploymentName: string;
  cloudflareAccountId: string;
};

function hostedOrigin(value: string, suffix = ''): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Set convexUrl and both hosts in tooling/deploy/src/environments.ts first.');
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
      'Release URLs must be HTTPS origins, without credentials, paths, queries, or fragments.'
    );
  return url;
}

export function releaseTarget(
  environment: ReleaseEnvironment,
  settings: Environment
): ReleaseTarget {
  const { cloudflareAccountId } = settings;
  if (cloudflareAccountId && !/^[a-f0-9]{32}$/u.test(cloudflareAccountId))
    throw new Error('Configure a valid Cloudflare account ID.');
  const cloud = hostedOrigin(settings.convexUrl, '.convex.cloud');
  const site = hostedOrigin(`https://${settings.web.host}`);
  const landing = hostedOrigin(`https://${settings.landing.host}`);
  if (
    [site, landing].some((origin) =>
      ['.convex.site', '.convex.cloud'].some((suffix) => origin.hostname.endsWith(suffix))
    )
  )
    throw new Error('The web and landing hosts must be Void origins; Convex serves the backend.');
  if (site.origin === landing.origin)
    throw new Error(
      'The web app and the landing site are separate deployments with their own origins.'
    );
  const hostPrefix = cloud.hostname.slice(0, -'.convex.cloud'.length);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z]{2}-[a-z]+-\d+)?$/u.test(hostPrefix))
    throw new Error('convexUrl must be a Convex deployment URL.');
  return {
    environment,
    workers: { web: settings.web.worker, landing: settings.landing.worker },
    convexUrl: cloud.origin,
    siteUrl: site.origin,
    landingUrl: landing.origin,
    backendSiteUrl: `https://${hostPrefix}.convex.site`,
    deploymentName: hostPrefix.split('.')[0] ?? '',
    cloudflareAccountId
  };
}
