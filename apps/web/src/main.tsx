import { env } from '@groam/env/web-client';
import { ConvexReactClient } from 'convex/react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { AppRoot } from './app-root.tsx';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('The application root element is missing');
}

createRoot(rootElement).render(
  <AppRoot client={new ConvexReactClient(env.convexUrl, { expectAuth: true })} />
);
