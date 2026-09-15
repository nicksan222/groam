import { defineSchema } from 'convex/server';
import { tables as generatedTables } from './generated';

// Better Auth reports compound access patterns at runtime. Keep custom indexes
// in this wrapper so schema regeneration never overwrites them.
export const tables = {
  ...generatedTables,
  invitation: generatedTables.invitation
    .index('by_email_and_organizationId_and_status', ['email', 'organizationId', 'status'])
    .index('by_organizationId_and_status', ['organizationId', 'status']),
  member: generatedTables.member.index('by_organizationId_and_userId', ['organizationId', 'userId'])
};

export default defineSchema(tables);
