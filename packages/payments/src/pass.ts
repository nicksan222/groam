import type { Checkout, PaymentProvider } from './provider';

function settled(id: string, fields: Partial<Checkout> = {}): Checkout {
  return { id, url: null, status: 'complete', paid: true, amount: null, currency: null, ...fields };
}

/**
 * Used when no real provider is configured, as in local development and tests: every traveler
 * already holds a paid pass, and any checkout is settled before it opens. Nothing is charged.
 */
export function passProvider(): PaymentProvider {
  return {
    name: 'Pass',
    collects: false,
    createCheckout: async ({ idempotencyKey, price, reference, deployment }) =>
      settled(`pass_${idempotencyKey}`, { ...price, reference, deployment }),
    retrieveCheckout: async (id) => settled(id),
    expireCheckout: async () => {},
    refundCheckout: async () => {},
    // No provider sends webhooks here.
    completedCheckout: async () => null
  };
}
