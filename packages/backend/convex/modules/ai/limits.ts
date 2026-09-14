import { HOUR, RateLimiter } from '@convex-dev/rate-limiter';
import { components } from '#convex-generated/api';

export const aiRateLimiter = new RateLimiter(components.rateLimiter, {
  tripAssistantMessage: {
    capacity: 6,
    kind: 'token bucket',
    period: HOUR,
    rate: 30
  },
  assistantThreadCreate: {
    capacity: 3,
    kind: 'token bucket',
    period: HOUR,
    rate: 10
  }
});
