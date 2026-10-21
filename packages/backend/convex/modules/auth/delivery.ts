import { emailRelayHeaders, emailRelayPath, signEmailRelay } from './relay';

/**
 * Send only from a Convex action. The Void Worker at the frontend origin sends the message with
 * `void/email`. Never include relay responses or links in errors.
 */
export async function deliverAuthEmail(
  configuration: { siteUrl: string; relaySecret: string },
  message: { to: string; subject: string; text: string }
) {
  const endpoint = new URL(emailRelayPath, configuration.siteUrl);
  const body = JSON.stringify(message);
  const timestamp = Date.now();
  // fallow-ignore-next-line security-sink -- fixed path on the configured frontend origin, redirects refused
  const response = await fetch(endpoint.href, {
    method: 'POST',
    redirect: 'error',
    headers: {
      'content-type': 'application/json',
      [emailRelayHeaders.signature]: await signEmailRelay(
        configuration.relaySecret,
        body,
        timestamp
      ),
      [emailRelayHeaders.timestamp]: String(timestamp)
    },
    body,
    signal: AbortSignal.timeout(15_000)
  });
  const confirmed = response.ok && (await response.json().catch(() => null))?.ok === true;
  if (!confirmed) throw new Error('Authentication email delivery failed');
}
