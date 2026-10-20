import { expect, test } from 'vite-plus/test';
import { assertProductionAuthEnvironment, assertProductionAuthOrigin } from './preflight';

const configured =
  'BETTER_AUTH_SECRET\nSITE_URL\nCLOUDFLARE_ACCOUNT_ID\nCLOUDFLARE_EMAIL_API_TOKEN\nAUTH_EMAIL_FROM';
test('requires email delivery configuration before production publication', () => {
  expect(() => assertProductionAuthEnvironment(configured)).not.toThrow();
  expect(() => assertProductionAuthEnvironment(configured.replace('AUTH_EMAIL_FROM', ''))).toThrow(
    'AUTH_EMAIL_FROM'
  );
  expect(() => assertProductionAuthEnvironment('')).toThrow(/production authentication/u);
});

test('allows no-key payment bypass and requires webhook configuration when Stripe is enabled', () => {
  expect(() => assertProductionAuthEnvironment(configured)).not.toThrow();
  expect(() =>
    assertProductionAuthEnvironment(`${configured}\nSTRIPE_WEBHOOK_SECRET`)
  ).not.toThrow();
  expect(() => assertProductionAuthEnvironment(`${configured}\nSTRIPE_SECRET_KEY`)).toThrow(
    'STRIPE_WEBHOOK_SECRET'
  );
  expect(() =>
    assertProductionAuthEnvironment(`${configured}\nSTRIPE_SECRET_KEY\nSTRIPE_WEBHOOK_SECRET`)
  ).not.toThrow();
});

test.each(['https://groam.example', 'https://groam.example/\n'])(
  'accepts the matching public frontend origin: %s',
  (configuredOrigin) => {
    expect(() =>
      assertProductionAuthOrigin(configuredOrigin, 'https://groam.example')
    ).not.toThrow();
  }
);

test.each([
  'https://old.convex.site',
  'https://groam.example/app/',
  'https://groam.example?next=app',
  'https://groam.example#app',
  'http://groam.example',
  'https://user:password@groam.example',
  '',
  'invalid'
])('rejects an auth origin that differs from the frontend: %s', (configuredOrigin) => {
  expect(() => assertProductionAuthOrigin(configuredOrigin, 'https://groam.example')).toThrow(
    'Convex SITE_URL'
  );
});
