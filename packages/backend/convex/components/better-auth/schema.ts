import { defineSchema } from 'convex/server';
import { tables as generatedTables } from './generated';

// Better Auth reports compound access patterns at runtime. Keep custom indexes
// in this wrapper so schema regeneration never overwrites them.
export const tables = {
  ...generatedTables,
  invitation: generatedTables.invitation
    .index('by_email_and_organizationId_and_status', ['email', 'organizationId', 'status'])
    .index('by_organizationId_and_status', ['organizationId', 'status']),
  member: generatedTables.member.index('by_organizationId_and_userId', [
    'organizationId',
    'userId'
  ]),
  // Listing a user's active sessions (userId, then expiresAt > now) would otherwise scan them all.
  // Without it @convex-dev/better-auth 0.12.5 pages through a full session scan, and its
  // handlePagination keeps a whole page then resumes from splitCursor on SplitRecommended,
  // returning duplicate sessions (duplicate React keys in Settings > Security).
  session: generatedTables.session.index('by_userId_and_expiresAt', ['userId', 'expiresAt'])
};

export default defineSchema(tables);
