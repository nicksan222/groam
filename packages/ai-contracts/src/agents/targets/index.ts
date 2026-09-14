import type { AssistantScreen } from '#ai-contracts/agents/screen';

export function resolveActiveTripId(
  tags: Array<{ tripId: string }>,
  screen: Pick<AssistantScreen, 'target'>
): string | null {
  const taggedTripIds = [...new Set(tags.map((tag) => tag.tripId))];
  return taggedTripIds.length === 1
    ? (taggedTripIds[0] ?? null)
    : screen.target.kind === 'trip'
      ? screen.target.tripId
      : null;
}
