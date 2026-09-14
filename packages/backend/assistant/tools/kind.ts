import {
  type AssistantCapability,
  assistantCapabilityIds
} from '@groam/ai-contracts/agents/registry';
import type { ToolSet } from 'ai';
import type {
  AssistantCapabilityRegistration,
  AssistantToolRuntime
} from '#backend/assistant/tools/factory';

/**
 * One assistant capability. Call `defineCapability` and
 * `AssistantToolKind.subscribe` it from `kinds/index.ts`. That registration
 * is what run logs use for tool names and labels. Callers use
 * `createRegisteredAssistantTools`.
 */
// biome-ignore lint/complexity/noStaticOnlyClass: callers use this class, not loose functions
export class AssistantToolKind {
  private static readonly registered = new Map<
    AssistantCapability,
    AssistantCapabilityRegistration
  >();

  static subscribe<T extends AssistantCapabilityRegistration>(registration: T): T {
    if (AssistantToolKind.registered.has(registration.id)) {
      throw new Error(`Assistant capability '${registration.id}' is already registered`);
    }
    for (const existing of AssistantToolKind.registered.values()) {
      if (existing.toolName === registration.toolName) {
        throw new Error(`Assistant tool '${registration.toolName}' is already registered`);
      }
    }
    AssistantToolKind.registered.set(registration.id, registration);
    return registration;
  }

  static all(): AssistantCapabilityRegistration[] {
    return assistantCapabilityIds.flatMap((id) => {
      const registration = AssistantToolKind.registered.get(id);
      return registration ? [registration] : [];
    });
  }

  static byToolName(toolName: string): AssistantCapabilityRegistration | undefined {
    for (const registration of AssistantToolKind.registered.values()) {
      if (registration.toolName === toolName) return registration;
    }
    return undefined;
  }

  static toolSet(
    registration: AssistantCapabilityRegistration,
    runtime: AssistantToolRuntime
  ): ToolSet | null {
    if (registration.createToolSet) {
      return registration.createToolSet(runtime);
    }
    const tool = registration.create(runtime);
    return tool ? { [registration.toolName]: tool } : null;
  }
}
