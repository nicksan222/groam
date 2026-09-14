/** Turn stored slugs (`brave-otter`, `dates/coast-day`) into a travel nickname. */
export function formatIdeaDisplayName(name: string): string {
  const joined = name
    .split('/')
    .map((segment) => segment.replace(/[_-]+/gu, ' ').replace(/\s+/gu, ' ').trim())
    .filter((segment) => segment.length > 0)
    .join(' · ');
  if (joined.length === 0) return name;
  return joined.replace(/^\S/u, (letter) => letter.toUpperCase());
}
