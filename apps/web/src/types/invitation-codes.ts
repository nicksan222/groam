import type { api } from '@groam/backend/api';
import type { FunctionReturnType } from 'convex/server';

export type InvitationCode = FunctionReturnType<
  typeof api.routes.organizations.invitations.list.run
>[number];
