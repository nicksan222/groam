import { HOUR, MINUTE, RateLimiter } from '@convex-dev/rate-limiter';
import { components } from '#convex-generated/api';

export const MAX_DISCUSSION_MEMBERS = 25;
export const MAX_DISCUSSIONS_PER_USER = 100;
export const MAX_MESSAGE_ATTACHMENT_RECEIPTS = 200;
export const MAX_MESSAGES_PAGE_SIZE = 50;
export const MAX_TITLE_LENGTH = 80;

export const discussionRateLimiter = new RateLimiter(components.rateLimiter, {
  discussionCreate: {
    capacity: 3,
    kind: 'token bucket',
    period: HOUR,
    rate: 10
  },
  discussionMessage: {
    capacity: 12,
    kind: 'token bucket',
    period: MINUTE,
    rate: 60
  }
});
