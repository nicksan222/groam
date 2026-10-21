import { cleanEnv, str } from 'envalid';
import { schemaFor, variableNames } from '#src/deployment/variables';

const values = cleanEnv(process.env, {
  GROAM_ENVIRONMENT: str({ choices: ['beta', 'production'], default: 'production' }),
  // The GitHub environment's secrets, as defined in @groam/env/deployment.
  ...schemaFor('github', () => str({ default: '' })),
  GITHUB_ACTIONS: str({ default: '' }),
  GITHUB_REPOSITORY: str({ default: '' }),
  GITHUB_REF: str({ default: '' }),
  GITHUB_EVENT_NAME: str({ default: '' }),
  GITHUB_SHA: str({ default: '' })
});

// Expose only the public deployment name, never the credential itself.
const keyDeploymentName = /^prod:([a-z0-9-]+)\|.+$/u.exec(values.CONVEX_DEPLOY_KEY)?.[1] ?? null;

export const env = {
  environment: values.GROAM_ENVIRONMENT as 'beta' | 'production',
  /** Names of the GitHub environment secrets this process received, never their values. */
  githubSecrets: new Set<string>(variableNames('github').filter((name) => values[name].length > 0)),
  hasCloudflareToken: values.CLOUDFLARE_API_TOKEN.length > 0,
  isGitHubActions: values.GITHUB_ACTIONS === 'true',
  repository: values.GITHUB_REPOSITORY,
  ref: values.GITHUB_REF,
  eventName: values.GITHUB_EVENT_NAME,
  sha: values.GITHUB_SHA,
  keyDeploymentName
} as const;
