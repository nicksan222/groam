import type { FunctionArgs } from 'convex/server';
import { api } from '#convex-generated/api';
import type { setupTrip } from '#testing/trips';

export type AttachmentClient = Awaited<ReturnType<typeof setupTrip>>['owner']['client'];
export type SetAttachmentsArgs = FunctionArgs<typeof api.routes.trips.attachments.set.run>;
export type ListAttachmentsArgs = FunctionArgs<typeof api.routes.trips.attachments.list.run>;

export function setTripAttachments(client: AttachmentClient, args: SetAttachmentsArgs) {
  return client.mutation(api.routes.trips.attachments.set.run, args);
}

export function listTripAttachments(client: AttachmentClient, args: ListAttachmentsArgs) {
  return client.query(api.routes.trips.attachments.list.run, args);
}
