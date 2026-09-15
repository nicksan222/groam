import { describe, expect, test } from 'vitest';
import { type AssistantScreen, validateAssistantScreen } from './index';

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

describe('validateAssistantScreen', () => {
  test('accepts a well-formed screen snapshot', () => {
    expect(() => validateAssistantScreen(validScreen())).not.toThrow();
  });

  test('allows empty screen data', () => {
    expect(() => validateAssistantScreen(validScreen({ data: '' }))).not.toThrow();
  });

  test('rejects blank required text fields', () => {
    expect(() => validateAssistantScreen(validScreen({ key: '   ' }))).toThrow(
      'Screen context key is required'
    );
    expect(() => validateAssistantScreen(validScreen({ title: '' }))).toThrow(
      'Screen context title is required'
    );
    expect(() => validateAssistantScreen(validScreen({ description: '  ' }))).toThrow(
      'Screen context description is required'
    );
  });

  test('rejects fields that exceed length limits', () => {
    expect(() => validateAssistantScreen(validScreen({ key: 'k'.repeat(201) }))).toThrow(
      'Screen context key is too long'
    );
    expect(() => validateAssistantScreen(validScreen({ title: 't'.repeat(121) }))).toThrow(
      'Screen context title is too long'
    );
    expect(() => validateAssistantScreen(validScreen({ description: 'd'.repeat(501) }))).toThrow(
      'Screen context description is too long'
    );
    expect(() => validateAssistantScreen(validScreen({ data: 'x'.repeat(64_001) }))).toThrow(
      'Screen context data is too long'
    );
  });
});
