import { environments } from '@groam/deploy/environments';
import { env } from '@groam/env/void';
import { env as webEnv } from '@groam/env/web';
import { defineConfig } from 'void/config';

const { web } = environments[env.environment];

// The web app's own Void deployment (the landing site deploys separately from apps/landing).
// Convex stays the application and authentication backend.
export default defineConfig({
  cloudflare: {
    name: web.worker,
    routes: [{ custom_domain: true, pattern: web.host }],
    preview_urls: false,
    workers_dev: true
  },
  // Authentication mail (routes/api/email.ts). Local development captures it in Void's inbox;
  // releases set AUTH_EMAIL_FROM from the environment's emailFrom.
  email: { from: webEnv.authEmailFrom },
  head: {
    htmlAttrs: { lang: 'en' },
    link: [
      { href: '/groam.svg', rel: 'icon', type: 'image/svg+xml' },
      { href: '/favicon.ico', rel: 'icon', sizes: '48x48' },
      { href: '/apple-touch-icon.png', rel: 'apple-touch-icon' }
    ],
    meta: [
      { charset: 'UTF-8' },
      { content: 'width=device-width, initial-scale=1.0', name: 'viewport' },
      {
        content:
          'Plan group trips together with shared itineraries, reviewable ideas, and context-aware AI.',
        name: 'description'
      },
      // Void keeps one meta tag per name, so the browser chrome follows the light theme.
      { content: '#ffffff', name: 'theme-color' },
      { content: 'website', property: 'og:type' },
      { content: 'Groam — Plan together. Go further.', property: 'og:title' },
      {
        content: 'One live workspace for group trips, decisions, and plans.',
        property: 'og:description'
      },
      { content: 'summary', name: 'twitter:card' }
    ],
    title: 'Groam — Plan together. Go further.'
  },
  worker: { compatibility_date: '2026-10-01' }
});
