export type ReleaseEnvironment = 'beta' | 'production';

export type FrontendApp = 'web' | 'landing';

export type Frontend = {
  /** The Cloudflare Worker that Void deploys this app to. */
  worker: string;
  /** The custom domain Void attaches to that Worker. */
  host: string;
};

export type Environment = {
  /** The Convex production deployment URL, from the project's dashboard. */
  convexUrl: string;
  /** Only needed when the Cloudflare token can reach several accounts. */
  cloudflareAccountId: string;
  /**
   * The account's workers.dev subdomain (`my-team`). Version preview URLs are off, so Void checks
   * each new version there before it takes traffic.
   */
  workersSubdomain: string;
} & Record<FrontendApp, Frontend>;

/**
 * Public settings for each hosted environment: the single source of truth for releases.
 * Void creates the Workers and their custom domains from these, and the release sets Convex
 * SITE_URL to the web origin. Secrets live only in the matching GitHub environment.
 */
export const environments: Record<ReleaseEnvironment, Environment> = {
  production: {
    convexUrl: '',
    cloudflareAccountId: '',
    workersSubdomain: '',
    web: { worker: 'groam-app', host: 'app.groam.app' },
    landing: { worker: 'groam-landing', host: 'groam.app' }
  },
  beta: {
    convexUrl: '',
    cloudflareAccountId: '',
    workersSubdomain: '',
    web: { worker: 'groam-app-beta', host: 'app.beta.groam.app' },
    landing: { worker: 'groam-landing-beta', host: 'beta.groam.app' }
  }
};
