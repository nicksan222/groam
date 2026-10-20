import type { ResearchSource } from '@/types/research';

export function researchSourceUrl(value: string): URL | null {
  try {
    const url = new URL(value.trim());
    return (url.protocol === 'https:' || url.protocol === 'http:') && !url.username && !url.password
      ? url
      : null;
  } catch {
    return null;
  }
}

function extractSource(match: string): ResearchSource | null {
  let candidate = match.replace(/[.,!?:;]+$/, '');
  while (candidate.endsWith(')') && candidate.split(')').length > candidate.split('(').length) {
    candidate = candidate.slice(0, -1);
  }
  const url = researchSourceUrl(candidate.replace(/[\]}]+$/, ''));
  if (!url) return null;
  url.hash = '';
  const trackingKeys = [...url.searchParams.keys()].filter((key) =>
    key.toLowerCase().startsWith('utm_')
  );
  for (const key of trackingKeys) url.searchParams.delete(key);
  return {
    host: url.host,
    href: url.href,
    path: `${url.pathname === '/' ? '' : url.pathname}${url.search}`
  };
}

/** Sources come from report and note URLs, deduplicated without citation tracking parameters. */
export function researchSources(messages: { text: string }[]): ResearchSource[] {
  const sources = new Map<string, ResearchSource>();
  for (const message of messages) {
    for (const match of message.text.matchAll(/https?:\/\/[^\s<>"`]+/gi)) {
      const source = extractSource(match[0]);
      if (source) sources.set(source.href, source);
    }
  }
  return [...sources.values()];
}
