import { aiKeyProviderIds } from '@groam/ai-contracts/providers/keys';
import { v } from 'convex/values';
import { assistantProviderIds } from './providers';

function unionOf<T extends string>(ids: readonly T[]) {
  const literals = ids.map((id) => v.literal(id));
  return v.union(
    ...(literals as [
      (typeof literals)[number],
      (typeof literals)[number],
      ...(typeof literals)[number][]
    ])
  );
}

export const assistantProviderValidator = unionOf(assistantProviderIds);
export const aiKeyProviderValidator = unionOf(aiKeyProviderIds);

export const aiKeyCredentialsValidator = v.object({
  apiKey: v.string(),
  baseUrl: v.optional(v.string()),
  model: v.optional(v.string()),
  provider: aiKeyProviderValidator
});
