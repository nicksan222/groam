import { assistantProviderIds } from '@groam/ai-contracts/provider';
import { AssistantProviderKind } from '#backend/ai/providers/kind';
import { AnthropicProvider } from '#backend/ai/providers/kinds/anthropic';
import { GoogleProvider } from '#backend/ai/providers/kinds/google';
import { OpenAIProvider } from '#backend/ai/providers/kinds/openai';

AssistantProviderKind.subscribe(new OpenAIProvider());
AssistantProviderKind.subscribe(new AnthropicProvider());
AssistantProviderKind.subscribe(new GoogleProvider());

const registered = new Set(AssistantProviderKind.all().map((kind) => kind.id));
for (const id of assistantProviderIds) {
  if (!registered.has(id)) {
    throw new Error(`Assistant provider '${id}' must be subscribed in kinds/index.ts`);
  }
}
