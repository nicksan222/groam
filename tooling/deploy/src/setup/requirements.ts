import {
  deploymentVariables,
  type DeploymentVariable,
  type VariableStore
} from '@groam/env/deployment';
import type { ReleaseEnvironment } from '#src/environments';

/** Where a value lives. */
export type Location =
  | 'tooling/deploy/src/environments.ts'
  | 'tooling/deploy/locks'
  | 'GitHub environment secret'
  | 'GitHub repository variable'
  | 'Cloudflare API token'
  | 'Convex environment'
  | 'apps/web (Void)';

export type Requirement = {
  name: string;
  location: Location;
  /** How to get or create the value. */
  how: string;
  /** `you` set it once; `release` sets it on every deploy. */
  setBy: 'you' | 'release';
  optional?: boolean;
};

/** The GitHub environment that holds each release environment's secrets. */
export const githubEnvironments: Record<ReleaseEnvironment, string> = {
  production: 'prod',
  beta: 'beta'
};

/** Repository variable that turns on a release workflow once setup is complete. */
export const releaseSwitches: Record<ReleaseEnvironment, string> = {
  production: 'CONVEX_PRODUCTION_ENABLED',
  beta: 'CONVEX_BETA_ENABLED'
};

/**
 * Everything an environment needs before it can release, behind `bun run deploy:setup`. Variables
 * come from @groam/env/deployment; the rest is configuration, permissions, and files.
 */
export function requirements(environment: ReleaseEnvironment): Requirement[] {
  const github = githubEnvironments[environment];
  const variables = (store: VariableStore, location: Location, suffix = ''): Requirement[] =>
    (Object.entries(deploymentVariables[store]) as [string, DeploymentVariable][]).map(
      ([name, variable]) => ({
        name,
        location,
        setBy: variable.setBy,
        ...(variable.optional ? { optional: true } : {}),
        how: `${variable.how}${suffix}`
      })
    );
  return [
    {
      name: 'convexUrl',
      location: 'tooling/deploy/src/environments.ts',
      setBy: 'you',
      how: 'Create the Convex project in the dashboard and copy its production deployment URL.'
    },
    {
      name: 'web.host, landing.host',
      location: 'tooling/deploy/src/environments.ts',
      setBy: 'you',
      how: 'Hostnames in a Cloudflare zone you own; Void attaches them as custom domains.'
    },
    {
      name: 'workersSubdomain',
      location: 'tooling/deploy/src/environments.ts',
      setBy: 'you',
      how: 'Cloudflare → Workers & Pages → your workers.dev subdomain (e.g. "my-team"); Void checks each new version there because preview URLs are off.'
    },
    {
      name: 'emailFrom',
      location: 'tooling/deploy/src/environments.ts',
      setBy: 'you',
      how: 'Sender of authentication mail, e.g. "Groam <noreply@groam.app>", on a domain in your Cloudflare account.'
    },
    {
      name: 'cloudflareAccountId',
      location: 'tooling/deploy/src/environments.ts',
      setBy: 'you',
      optional: true,
      how: 'Only when the Cloudflare token can reach several accounts.'
    },
    ...variables('github', 'GitHub environment secret', ` (GitHub environment "${github}")`),
    {
      name: 'Workers Scripts: Edit',
      location: 'Cloudflare API token',
      setBy: 'you',
      how: 'Account permission: lets Void create and deploy the Workers.'
    },
    {
      name: 'Workers Routes: Edit',
      location: 'Cloudflare API token',
      setBy: 'you',
      how: 'Zone permission: lets Void attach the custom domains.'
    },
    {
      name: 'Email Routing: Edit, Email Sending: Edit',
      location: 'Cloudflare API token',
      setBy: 'you',
      how: 'Zone permissions: let Void set up authentication mail for the sender domain.'
    },
    ...variables('convex', 'Convex environment'),
    ...variables('worker', 'apps/web (Void)'),
    {
      name: 'void email setup',
      location: 'apps/web (Void)',
      setBy: 'you',
      how: 'Needs a Workers Paid plan with Email Sending onboarded (to mail any recipient). Then, in apps/web, run `void email setup --platform cloudflare`; the sender comes from emailFrom.'
    },
    {
      name: `${environment}/web.void.lock.json, ${environment}/landing.void.lock.json`,
      location: 'tooling/deploy/locks',
      setBy: 'you',
      how: `Run the first \`void deploy --platform cloudflare\` in apps/web and apps/landing with GROAM_ENVIRONMENT=${environment}, then commit each void.lock.json here.`
    },
    {
      name: releaseSwitches[environment],
      location: 'GitHub repository variable',
      setBy: 'you',
      how:
        environment === 'production'
          ? 'Set to `true` once everything above is in place. Production only releases after the same revision deployed to beta and passed its end-to-end checks, so beta must be on too.'
          : 'Set to `true` once everything above is in place. Every main push then deploys here first and runs the end-to-end checks.'
    }
  ];
}
