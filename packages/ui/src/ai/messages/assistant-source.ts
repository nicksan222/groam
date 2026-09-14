import type { UIMessage } from '@convex-dev/agent/react';

export type AssistantSource = { title: string; url: string };

export function assistantSources(parts: UIMessage['parts']): AssistantSource[] {
  const sources = new Map<string, AssistantSource>();
  for (const part of parts) {
    if (part.type !== 'source-url' || typeof part.url !== 'string') continue;
    let fallbackTitle = part.url;
    try {
      fallbackTitle = new URL(part.url).hostname.replace(/^www\./u, '');
    } catch {
      // Keep the original URL for malformed legacy source metadata.
    }
    sources.set(part.url, {
      title: typeof part.title === 'string' && part.title.trim() ? part.title : fallbackTitle,
      url: part.url
    });
  }
  return [...sources.values()].slice(0, 8);
}
