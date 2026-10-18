import { cleanEnv, url } from 'envalid';

const validated = cleanEnv(process.env, {
  VITE_SITE_URL: url({
    default: 'http://localhost:5173',
    desc: 'Public web application URL that landing page calls to action open'
  }),
  LANDING_SITE_URL: url({
    default: 'http://localhost:4321',
    desc: 'Public origin of the landing site, used for canonical URLs, social cards, and the sitemap'
  })
});

export const env = {
  appUrl: validated.VITE_SITE_URL,
  siteUrl: validated.LANDING_SITE_URL
} as const;
