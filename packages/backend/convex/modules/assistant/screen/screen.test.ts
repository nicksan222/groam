import { ConvexError } from 'convex/values';
import { describe, expect, test } from 'vitest';
import { AssistantScreens } from '#convex/modules/assistant/screen/index';
import type { AssistantScreen } from '#convex/modules/assistant/validators/index';

function validScreen(overrides: Partial<AssistantScreen> = {}): AssistantScreen {
  return {
    capabilities: [],
    data: '{}',
    description: 'Trip overview screen',
    key: 'trip:test:overview',
    target: { kind: 'workspace' },
    title: 'Overview',
    ...overrides
  };
}

describe('AssistantScreens', () => {
  test('accepts a well-formed screen snapshot', () => {
    expect(() => AssistantScreens.validate(validScreen())).not.toThrow();
  });

  test('allows empty screen data', () => {
    expect(() => AssistantScreens.validate(validScreen({ data: '' }))).not.toThrow();
  });

  test('rejects blank required text fields', () => {
    expect(() => AssistantScreens.validate(validScreen({ key: '   ' }))).toThrow(
      'Screen context key is required'
    );
    expect(() => AssistantScreens.validate(validScreen({ title: '' }))).toThrow(
      'Screen context title is required'
    );
    expect(() => AssistantScreens.validate(validScreen({ description: '  ' }))).toThrow(
      'Screen context description is required'
    );
  });

  test('rejects fields that exceed length limits', () => {
    expect(() => AssistantScreens.validate(validScreen({ key: 'k'.repeat(201) }))).toThrow(
      'Screen context key is too long'
    );
    expect(() => AssistantScreens.validate(validScreen({ title: 't'.repeat(121) }))).toThrow(
      'Screen context title is too long'
    );
    expect(() => AssistantScreens.validate(validScreen({ description: 'd'.repeat(501) }))).toThrow(
      'Screen context description is too long'
    );
    expect(() => AssistantScreens.validate(validScreen({ data: 'x'.repeat(64_001) }))).toThrow(
      'Screen context data is too long'
    );
  });

  test('throws ConvexError for invalid input', () => {
    try {
      AssistantScreens.validate(validScreen({ title: '' }));
    } catch (error) {
      expect(error).toBeInstanceOf(ConvexError);
    }
  });
});
