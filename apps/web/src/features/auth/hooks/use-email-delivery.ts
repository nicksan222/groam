import { api } from '@groam/backend/api';
import { useQuery } from 'convex/react';

/**
 * Whether the deployment can deliver authentication email (Resend is optional). Undefined while
 * loading; false means password reset, verification, and email-change links would never arrive.
 */
export function useEmailDelivery() {
  return useQuery(api.routes.auth.email.run, {});
}
