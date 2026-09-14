import { GroamAuthProvider } from '@groam/auth/provider';
import { env } from '@groam/env/web-client';
import { UiThemeProvider } from '@groam/ui/components/theme-provider';
import { ConvexReactClient } from 'convex/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './app.tsx';

const convexUrl = env.convexUrl;
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('The application root element is missing');
}

const convex = new ConvexReactClient(convexUrl, { expectAuth: true });

createRoot(rootElement).render(
  <StrictMode>
    <UiThemeProvider>
      <GroamAuthProvider client={convex}>
        <App />
      </GroamAuthProvider>
    </UiThemeProvider>
  </StrictMode>
);
