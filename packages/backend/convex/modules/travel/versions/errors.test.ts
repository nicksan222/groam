import { expect, test } from 'vitest';
import { IdeaErrors } from './errors';

test('rethrowAsIdeaError preserves merge conflict messages', () => {
  expect(() => IdeaErrors.rethrow(new Error('Unable to automatically combine trip.json'))).toThrow(
    'Unable to automatically combine trip.json'
  );
});

test('rethrowAsIdeaError hides internal git failures from travelers', () => {
  expect(() => IdeaErrors.rethrow(new Error('Git could not read trip.json'))).toThrow(
    'Unable to process change history for this idea'
  );
  expect(() => IdeaErrors.rethrow(new Error('Trip version contains an invalid Git path'))).toThrow(
    'Unable to process change history for this idea'
  );
});

test('rethrowAsIdeaError passes through unrelated product errors', () => {
  expect(() => IdeaErrors.rethrow(new Error('Only draft ideas can be submitted'))).toThrow(
    'Only draft ideas can be submitted'
  );
});

test('rethrowAsIdeaError rethrows non-error values unchanged', () => {
  expect(() => IdeaErrors.rethrow('plain string')).toThrow('plain string');
});
