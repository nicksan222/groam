import { cleanEnv, email, str, url } from 'envalid';
import { baseSchema } from '#src/schemas/base';
import { withNodeEnvFlags } from './node-env-flags';

const validated = cleanEnv(process.env, {
  ...baseSchema,
  SEED_CONVEX_URL: url({ default: '' }),
  SEED_SITE_URL: url({ default: '' }),
  SEED_USER_EMAIL: email({ default: 'demo@groam.example' }),
  SEED_USER_PASSWORD: str({ default: 'GroamDemo123!' }),
  VITE_CONVEX_SITE_URL: url({ default: '' }),
  VITE_CONVEX_URL: url({ default: '' })
});

export const env = {
  ...withNodeEnvFlags(validated),
  seedConvexUrl: validated.SEED_CONVEX_URL || validated.VITE_CONVEX_URL,
  seedSiteUrl: validated.SEED_SITE_URL || validated.VITE_CONVEX_SITE_URL,
  seedUserEmail: validated.SEED_USER_EMAIL,
  seedUserPassword: validated.SEED_USER_PASSWORD
} as const;
