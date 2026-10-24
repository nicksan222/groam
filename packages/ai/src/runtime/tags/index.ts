import { ConvexError, type GenericId } from 'convex/values';
import * as z from 'zod/v3';
import {
  type AssistantContextTagKind,
  type AssistantContextTagMutationReference,
  type AssistantContextTagTable,
  assistantContextTagKinds
} from '#ai/runtime/tags/ids';

export type AssistantContextReferenceInput = {
  id: string;
  // Unvalidated on purpose: referenceForMutation narrows it to a known tag kind.
  kind: string;
};

/**
 * Chat attachments addressed by `{ kind, id }`. Each kind reads one table;
 * the table map below is the whole registry — add a row (plus its table in
 * `ids.ts`) to attach a new entity kind. Outside this folder, use these
 * functions, not the map.
 */
const tagTables = {
  activity: 'tripDestinationActivities',
  destination: 'tripDestinations',
  trip: 'trips'
} as const satisfies Record<AssistantContextTagKind, AssistantContextTagTable>;

export function isAssistantContextTagKind(value: string): value is AssistantContextTagKind {
  return Object.hasOwn(tagTables, value);
}

const [firstTagSchema, secondTagSchema, ...restTagSchemas] = assistantContextTagKinds.map((kind) =>
  z.object({ id: z.string(), kind: z.literal(kind) })
);
if (!firstTagSchema || !secondTagSchema) {
  throw new Error('Assistant context tags need at least two kinds');
}
const assistantContextTagSchema = z.discriminatedUnion('kind', [
  firstTagSchema,
  secondTagSchema,
  ...restTagSchemas
]);

export function assistantContextTagInputSchema() {
  return assistantContextTagSchema;
}

export function referenceForMutation(
  tag: AssistantContextReferenceInput
): AssistantContextTagMutationReference {
  if (!isAssistantContextTagKind(tag.kind)) {
    throw new ConvexError(`Unknown assistant context tag '${tag.kind}'`);
  }
  const table = tagTables[tag.kind];
  return {
    id: tag.id as GenericId<typeof table>,
    kind: tag.kind
  } as AssistantContextTagMutationReference;
}

export type {
  AssistantContextTagKind,
  AssistantContextTagMutationReference
} from '#ai/runtime/tags/ids';
