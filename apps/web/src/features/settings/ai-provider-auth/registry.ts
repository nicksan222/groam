import type { AiKeyProviderId } from '@groam/ai-contracts/providers/keys';
import type { AiProviderAuthStrategy } from '@/types/ai-provider-auth';
import { OpenRouterPkceStrategy } from './openrouter-pkce-strategy';

/** Implement a strategy and register one instance here to add another provider connection. */
const strategies = [
  new OpenRouterPkceStrategy()
] as const satisfies readonly AiProviderAuthStrategy[];

const strategiesByProvider = new Map<AiKeyProviderId, AiProviderAuthStrategy>(
  strategies.map((strategy) => [strategy.provider, strategy])
);

export function aiProviderAuthStrategy(provider: AiKeyProviderId) {
  return strategiesByProvider.get(provider) ?? null;
}
