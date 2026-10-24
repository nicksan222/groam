/** An amount in the currency's minor unit, e.g. 100 for €1. */
export type Price = { amount: number; currency: string };

/** A hosted checkout as the application sees it, whatever provider runs it. */
export type Checkout = {
  id: string;
  /** Where the traveler completes payment; null once the checkout is no longer open. */
  url: string | null;
  /** `complete` covers a finished checkout whose payment may still be processing. */
  status: 'open' | 'complete' | 'expired';
  paid: boolean;
  amount: number | null;
  currency: string | null;
  /** The application's payment id, echoed back so a completed checkout finds its seat. */
  reference?: string;
  /** Identifies the deployment that opened the checkout when several share one account. */
  deployment?: string;
};

export type CheckoutRequest = {
  price: Price;
  description: string;
  reference: string;
  deployment: string;
  returnUrl: string;
  /** Retries with the same key return the same checkout. */
  idempotencyKey: string;
};

export interface PaymentProvider {
  /** Shown to operators, e.g. in refund failure logs. */
  readonly name: string;
  /**
   * False when nothing is charged: every traveler already holds a paid pass, so seat checks
   * pass without a checkout.
   */
  readonly collects: boolean;
  createCheckout(request: CheckoutRequest): Promise<Checkout>;
  retrieveCheckout(id: string): Promise<Checkout>;
  /** Best effort: a checkout paid despite expiry is refunded when its completion arrives. */
  expireCheckout(id: string): Promise<void>;
  refundCheckout(id: string, idempotencyKey: string): Promise<void>;
  /**
   * The completed checkout a verified webhook reports, or null for events to acknowledge and
   * ignore. Throws `WebhookVerificationError` when the request is not from the provider.
   */
  completedCheckout(request: Request): Promise<Checkout | null>;
}

/** The provider failed or rejected a request; the message is safe to show travelers. */
export class PaymentProviderError extends Error {
  override name = 'PaymentProviderError';
}

export class WebhookVerificationError extends Error {
  override name = 'WebhookVerificationError';
}

export function matchesPrice(checkout: Pick<Checkout, 'amount' | 'currency'>, price: Price) {
  return checkout.amount === price.amount && checkout.currency === price.currency;
}
