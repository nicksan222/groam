import type { ChatAgentId } from '@groam/ai-contracts/agents/registry';
import { resolveActiveTripId } from '@groam/ai-contracts/agents/targets';
import type { AssistantProviderConfiguration } from '#backend/ai/providers/index';
import type { AssistantScreen } from '#convex/modules/assistant/validators/index';
import type { Id } from '#convex-generated/dataModel';

export type { AssistantConversationScope } from '@groam/ai-contracts/agents/instructions';

export type AssistantLanguageModel = AssistantProviderConfiguration['languageModel'];

export type AssistantConfiguration = Pick<
  AssistantProviderConfiguration,
  'languageModel' | 'providerTools'
>;

export type AssistantTarget = {
  agent: ChatAgentId;
  prompt: string;
  screen: AssistantScreen;
  threadId: string;
};

/** Resolves the trip an assistant turn should write against. */
// biome-ignore lint/complexity/noStaticOnlyClass: callers use this class, not loose functions
export class AssistantTargets {
  static activeTripId(
    tags: Array<{ tripId: string }>,
    screen: AssistantScreen
  ): Id<'trips'> | null {
    return resolveActiveTripId(tags, screen) as Id<'trips'> | null;
  }
}
