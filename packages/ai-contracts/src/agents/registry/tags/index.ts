import { ConvexError } from 'convex/values';
import * as z from 'zod/v3';
import type {
  AssistantContextTagKind,
  AssistantContextTagMutationReference
} from '#ai-contracts/agents/registry/tags/ids';
import { AssistantTagKind } from '#ai-contracts/agents/registry/tags/kind';
import '#ai-contracts/agents/registry/tags/kinds/index';

export type AssistantContextReferenceInput = {
  id: string;
  kind: AssistantContextTagKind;
};

/**
 * Chat attachments addressed by `{ kind, id }`. Outside this folder, use this
 * facade — do not import the tag kind map.
 */
// biome-ignore lint/complexity/noStaticOnlyClass: callers use this class, not loose functions
export class AssistantContextTags {
  static inputSchema() {
    const schemas = AssistantTagKind.all().map((kind) => kind.inputSchema());
    const [first, second, ...rest] = schemas;
    if (!first || !second) {
      throw new Error('Assistant context tags need at least two kinds');
    }
    return z.discriminatedUnion('kind', [first, second, ...rest]);
  }

  static referenceForMutation(
    tag: AssistantContextReferenceInput
  ): AssistantContextTagMutationReference {
    const kind = AssistantTagKind.of(tag.kind);
    if (!kind) throw new ConvexError(`Unknown assistant context tag '${tag.kind}'`);
    return kind.reference(tag.id);
  }

  static isKind(value: string): value is AssistantContextTagKind {
    return AssistantTagKind.of(value) !== undefined;
  }
}

export type {
  AssistantContextTagKind,
  AssistantContextTagMutationReference
} from '#ai-contracts/agents/registry/tags/ids';
