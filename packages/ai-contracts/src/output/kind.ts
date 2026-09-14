import { type AssistantFormComponentId, assistantFormComponentIds } from '#ai-contracts/output/ids';

/**
 * One assistant-generated UI component. Add a subclass, construct it in
 * `kinds/index.ts`, and `AssistantFormComponentKind.subscribe` it. Callers use
 * the form catalog facade, not this map.
 */
export class AssistantFormComponentKind<Definition = unknown> {
  private static readonly registered = new Map<string, AssistantFormComponentKind>();

  readonly definition: Definition;
  readonly id: AssistantFormComponentId;

  constructor(spec: { definition: Definition; id: AssistantFormComponentId }) {
    this.definition = spec.definition;
    this.id = spec.id;
  }

  static subscribe<T extends AssistantFormComponentKind>(kind: T): T {
    if (AssistantFormComponentKind.registered.has(kind.id)) {
      throw new Error(`Assistant form component '${kind.id}' is already registered`);
    }
    AssistantFormComponentKind.registered.set(kind.id, kind);
    return kind;
  }

  static all(): AssistantFormComponentKind[] {
    return assistantFormComponentIds.flatMap((id) => {
      const kind = AssistantFormComponentKind.registered.get(id);
      return kind ? [kind] : [];
    });
  }

  static catalogComponents(): Record<string, unknown> {
    return Object.fromEntries(
      AssistantFormComponentKind.all().map((kind) => [kind.id, kind.definition])
    );
  }
}
