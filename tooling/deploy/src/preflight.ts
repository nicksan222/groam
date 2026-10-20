const productionAuthVariables = [
  'BETTER_AUTH_SECRET',
  'SITE_URL',
  'CLOUDFLARE_ACCOUNT_ID',
  'CLOUDFLARE_EMAIL_API_TOKEN',
  'AUTH_EMAIL_FROM'
] as const;

/** Input comes from `convex env list --names-only`, never secret values. */
export function assertProductionAuthEnvironment(namesOutput: string): void {
  const names = new Set(namesOutput.split(/\s+/u).filter(Boolean));
  const missing = productionAuthVariables.filter((name) => !names.has(name));
  if (missing.length)
    throw new Error(
      `Configure production authentication before publishing: ${missing.join(', ')}.`
    );
  if (names.has('STRIPE_SECRET_KEY') && !names.has('STRIPE_WEBHOOK_SECRET'))
    throw new Error('Configure STRIPE_WEBHOOK_SECRET before enabling production payments.');
}

/** SITE_URL is public configuration; no authentication or payment secrets are read. */
export function assertProductionAuthOrigin(siteUrlOutput: string, expectedOrigin: string): void {
  let matches = false;
  try {
    matches = new URL(siteUrlOutput.trim()).href === new URL(expectedOrigin).href;
  } catch {
    // Missing or invalid public configuration must fail before deployment.
  }
  if (!matches)
    throw new Error(
      'Set the Convex SITE_URL to the configured public frontend origin before publishing.'
    );
}
