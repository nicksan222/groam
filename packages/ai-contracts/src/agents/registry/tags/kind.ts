import type { GenericId } from 'convex/values';
import * as z from 'zod/v3';
import {
  type AssistantContextTagKind,
  type AssistantContextTagMutationReference,
  type AssistantContextTagTable,
  assistantContextTagKinds
} from '#ai-contracts/agents/registry/tags/ids';

/**
 * One attachable chat context kind. Add a subclass, construct it in
 * `kinds/index.ts`, and `AssistantTagKind.subscribe` it. Callers use
 * `AssistantContextTags`, not this map.
 */
export class AssistantTagKind<
  Kind extends AssistantContextTagKind = AssistantContextTagKind,
  Table extends AssistantContextTagTable = AssistantContextTagTable
> {
  private static readonly registered = new Map<string, AssistantTagKind>();

  readonly kind: Kind;
  readonly table: Table;

  constructor(definition: { kind: Kind; table: Table }) {
    this.kind = definition.kind;
    this.table = definition.table;
  }

  static subscribe<T extends AssistantTagKind>(kind: T): T {
    if (AssistantTagKind.registered.has(kind.kind)) {
      throw new Error(`Assistant context tag '${kind.kind}' is already registered`);
    }
    AssistantTagKind.registered.set(kind.kind, kind);
    return kind;
  }

  static of(kind: string): AssistantTagKind | undefined {
    return AssistantTagKind.registered.get(kind);
  }

  static all(): AssistantTagKind[] {
    return assistantContextTagKinds.flatMap((kind) => {
      const registered = AssistantTagKind.registered.get(kind);
      return registered ? [registered] : [];
    });
  }

  inputSchema() {
    return z.object({ id: z.string(), kind: z.literal(this.kind) });
  }

  reference(id: string): AssistantContextTagMutationReference {
    return { id: id as GenericId<Table>, kind: this.kind } as AssistantContextTagMutationReference;
  }
}
