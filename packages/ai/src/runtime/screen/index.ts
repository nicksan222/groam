import type { AssistantCapability } from '#ai/agents';

export const assistantScreenLimits = {
  data: 64_000,
  description: 500,
  key: 200,
  title: 120
} as const;

export type AssistantTripSection =
  | 'activity'
  | 'ideas'
  | 'issues'
  | 'itinerary'
  | 'overview'
  | 'versions';

export type AssistantScreenTarget =
  | { kind: 'workspace' }
  | { kind: 'trip'; section: AssistantTripSection; tripId: string };

export type AssistantScreen = {
  capabilities: AssistantCapability[];
  data: string;
  description: string;
  key: string;
  target: AssistantScreenTarget;
  title: string;
};

/** Stable conversation scope: one history per trip, and one per workspace page elsewhere. */
export function assistantConversationContextKey(
  screen: Pick<AssistantScreen, 'key'> & { target?: AssistantScreenTarget }
): string {
  return screen.target?.kind === 'trip' ? `trip:${screen.target.tripId}` : screen.key;
}

export function validateAssistantScreen(screen: AssistantScreen): void {
  const values = [
    [screen.key, assistantScreenLimits.key, 'Screen context key', true],
    [screen.title, assistantScreenLimits.title, 'Screen context title', true],
    [screen.description, assistantScreenLimits.description, 'Screen context description', true],
    [screen.data, assistantScreenLimits.data, 'Screen context data', false]
  ] as const;
  for (const [value, maximum, label, required] of values) {
    if (required && value.trim().length === 0) {
      throw new Error(`${label} is required`);
    }
    if (value.length > maximum) throw new Error(`${label} is too long`);
  }
}
