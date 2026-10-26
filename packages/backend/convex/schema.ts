import { defineSchema } from 'convex/server';
import { chatGptTables } from './modules/ai/chatgpt/schema';
import { assistantRunTables } from './modules/assistant/runs/schema';
import { agentWaitTables } from './modules/assistant/waits/schema';
import { discussionLinkTables } from './modules/discussions/links/schema';
import { discussionTables } from './modules/discussions/threads/schema';
import { mediaTables } from './modules/media/library/schema';
import { notificationTables } from './modules/notifications/schema';
import { onboardingTables } from './modules/onboarding/schema';
import { organizationInvitationTables } from './modules/organizations/invitations/schema';
import { paymentTables } from './modules/payments/schema';
import { pollTables } from './modules/polls/schema';
import { tripActivityTables } from './modules/travel/activities/schema';
import { tripAuditTables } from './modules/travel/audit/schema';
import { tripDestinationTables } from './modules/travel/destinations/schema';
import { tripIssueTables } from './modules/travel/issues/schema';
import { tripPackingTables } from './modules/travel/packing/schema';
import { tripPreferenceTables } from './modules/travel/preferences/schema';
import { tripStayTables } from './modules/travel/stays/schema';
import { tripTransferTables } from './modules/travel/transfers/schema';
import { tripTravelerTables } from './modules/travel/travelers/schema';
import { tripTables } from './modules/travel/trips/schema';
import { tripVersionTables } from './modules/travel/versions/schema';

export default defineSchema({
  ...paymentTables,
  ...chatGptTables,
  ...assistantRunTables,
  ...agentWaitTables,
  ...mediaTables,
  ...discussionTables,
  ...discussionLinkTables,
  ...notificationTables,
  ...onboardingTables,
  ...organizationInvitationTables,
  ...pollTables,
  ...tripTables,
  ...tripAuditTables,
  ...tripDestinationTables,
  ...tripActivityTables,
  ...tripIssueTables,
  ...tripPackingTables,
  ...tripStayTables,
  ...tripTransferTables,
  ...tripTravelerTables,
  ...tripVersionTables,
  ...tripPreferenceTables
});
