import type { LanguageModelV4 } from '@ai-sdk/provider';
import type { AssistantProviderEnvironment } from '@groam/ai-contracts/provider';
import { type AssistantProviderId, assistantProviderIds } from '@groam/ai-contracts/provider';
import type { ToolSet } from 'ai';

export type AssistantProviderConfiguration = {
  languageModel: LanguageModelV4;
  modelId: string;
  providerId: AssistantProviderId;
  providerTools?: ToolSet;
};

/**
 * One model provider. Add a subclass, construct it in `kinds/index.ts`, and
 * `AssistantProviderKind.subscribe` it. Callers use `configuredAssistantProvider`.
 */
export class AssistantProviderKind {
  private static readonly registered = new Map<string, AssistantProviderKind>();

  readonly defaultModel: string;
  readonly id: AssistantProviderId;

  constructor(definition: { defaultModel: string; id: AssistantProviderId }) {
    this.defaultModel = definition.defaultModel;
    this.id = definition.id;
  }

  static subscribe<T extends AssistantProviderKind>(kind: T): T {
    if (AssistantProviderKind.registered.has(kind.id)) {
      throw new Error(`Assistant provider '${kind.id}' is already registered`);
    }
    AssistantProviderKind.registered.set(kind.id, kind);
    return kind;
  }

  static of(id: string): AssistantProviderKind | undefined {
    return AssistantProviderKind.registered.get(id);
  }

  static all(): AssistantProviderKind[] {
    return assistantProviderIds.flatMap((id) => {
      const kind = AssistantProviderKind.registered.get(id);
      return kind ? [kind] : [];
    });
  }

  configure(
    _modelId: string,
    _configuration: AssistantProviderEnvironment,
    _webSearchEnabled: boolean
  ): Omit<AssistantProviderConfiguration, 'modelId' | 'providerId'> {
    throw new Error(`Assistant provider '${this.id}' must implement configure`);
  }
}
