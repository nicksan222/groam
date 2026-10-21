import type { ReleaseTarget } from '#src/release/target';

/**
 * The environment for `void deploy`: public build values and the Cloudflare token, never backend
 * credentials. Void keeps the Cloudflare token out of the builds it runs.
 */
export function frontendEnvironment(
  target: ReleaseTarget,
  inherited: NodeJS.ProcessEnv
): NodeJS.ProcessEnv {
  return {
    ...Object.fromEntries(
      Object.entries(inherited).filter(([key]) => !/^(?:CONVEX_|STRIPE_|BETTER_AUTH_)/u.test(key))
    ),
    GROAM_ENVIRONMENT: target.environment,
    ...(target.cloudflareAccountId ? { CLOUDFLARE_ACCOUNT_ID: target.cloudflareAccountId } : {}),
    // Version preview URLs are off; Void checks new versions on the workers.dev subdomain.
    CLOUDFLARE_WORKERS_SUBDOMAIN: target.workersSubdomain,
    VITE_CONVEX_URL: target.convexUrl,
    VITE_CONVEX_SITE_URL: target.backendSiteUrl,
    VITE_SITE_URL: target.siteUrl,
    VITE_LANDING_URL: target.landingUrl,
    LANDING_SITE_URL: `${target.landingUrl}/`,
    AUTH_EMAIL_FROM: target.emailFrom,
    ASTRO_TELEMETRY_DISABLED: '1'
  };
}
