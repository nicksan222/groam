import { cleanEnv, str } from 'envalid';

const values = cleanEnv(process.env, {
  CONVEX_URL: str({ default: '' }),
  SITE_URL: str({ default: '' }),
  CONVEX_DEPLOY_KEY: str({ default: '' }),
  GITHUB_ACTIONS: str({ default: '' }),
  GITHUB_REPOSITORY: str({ default: '' }),
  GITHUB_REF: str({ default: '' }),
  GITHUB_EVENT_NAME: str({ default: '' }),
  GITHUB_SHA: str({ default: '' })
});

// Expose only the public deployment name, never the credential itself.
const keyDeploymentName = /^prod:([a-z0-9-]+)\|.+$/u.exec(values.CONVEX_DEPLOY_KEY)?.[1] ?? null;

export const env = {
  convexUrl: values.CONVEX_URL,
  siteUrl: values.SITE_URL,
  isGitHubActions: values.GITHUB_ACTIONS === 'true',
  repository: values.GITHUB_REPOSITORY,
  ref: values.GITHUB_REF,
  eventName: values.GITHUB_EVENT_NAME,
  sha: values.GITHUB_SHA,
  keyDeploymentName
} as const;
