import { passProvider } from './pass';
import type { PaymentProvider } from './provider';
import { type StripeConfig, stripeProvider } from './stripe';

export { passProvider } from './pass';
export {
  type Checkout,
  type CheckoutRequest,
  matchesPrice,
  type PaymentProvider,
  PaymentProviderError,
  type Price,
  WebhookVerificationError
} from './provider';
export { stripeProvider, verifyStripeSignature } from './stripe';

export type PaymentConfig = {
  stripe?: { [K in keyof StripeConfig]?: string | undefined };
};

const filled = (value: string | undefined): value is string => Boolean(value?.trim());

/**
 * The configured provider. Without complete credentials every traveler holds an already-paid
 * pass, so seat checks run the same everywhere and nothing is charged.
 */
export function paymentProvider({ stripe }: PaymentConfig): PaymentProvider {
  if (stripe && filled(stripe.secretKey) && filled(stripe.webhookSecret))
    return stripeProvider({ secretKey: stripe.secretKey, webhookSecret: stripe.webhookSecret });
  return passProvider();
}
