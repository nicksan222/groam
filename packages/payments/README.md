# Payments package

Provider-agnostic hosted checkout for Groam. The backend talks to a
`PaymentProvider` and never to a payment API directly; seat rules, tables, and
refund scheduling stay in `packages/backend/convex/modules/payments`.

```ts
import { paymentProvider } from '@groam/payments';

const provider = paymentProvider({ stripe: { secretKey, webhookSecret } });
```

| Provider | Selected when                         | Behavior                                                     |
| -------- | ------------------------------------- | ------------------------------------------------------------ |
| Stripe   | Both Stripe credentials are set       | Stripe Checkout over REST, signed webhooks, idempotent refunds |
| Pass     | Any credential is missing (local, tests) | `collects: false`: every traveler already holds a paid pass; checkouts settle immediately, nothing is charged |

Because the pass provider answers "already paid", seat checks run unchanged in
every environment; no caller branches on whether payments are configured.

To add a provider, implement `PaymentProvider` in `src/<provider>.ts`, select it
in `paymentProvider`, and keep provider-specific payloads (metadata names,
signature formats) inside the adapter. The package has no Convex dependency, so
it runs in any JavaScript runtime with `fetch` and Web Crypto.
