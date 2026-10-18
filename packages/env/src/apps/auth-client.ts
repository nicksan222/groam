import { cleanEnv, str, url } from 'envalid';
import { clientEnvString } from '#src/lib/client-env';
import { resolveConvexSiteUrl } from '#src/lib/convex-url';

const validated = cleanEnv(
  {
    VITE_CONVEX_SITE_URL: clientEnvString(import.meta.env.VITE_CONVEX_SITE_URL),
    VITE_CONVEX_URL: clientEnvString(import.meta.env.VITE_CONVEX_URL)
  },
  {
    VITE_CONVEX_SITE_URL: str({ default: '' }),
    VITE_CONVEX_URL: url({ default: 'http://127.0.0.1:3210', desc: 'Convex realtime client URL' })
  }
);

export const env = {
  convexSiteUrl: resolveConvexSiteUrl(validated.VITE_CONVEX_URL, validated.VITE_CONVEX_SITE_URL),
  convexUrl: validated.VITE_CONVEX_URL
} as const;
