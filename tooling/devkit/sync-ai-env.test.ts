import { describe, expect, test } from 'bun:test';
import { syncOptionalAiEnvironment } from './sync-ai-env';

describe('syncOptionalAiEnvironment', () => {
  test('skips convex env set when no optional AI variables are configured', () => {
    let called = false;

    syncOptionalAiEnvironment({}, () => {
      called = true;
      return { status: 0, stderr: '', stdout: '' };
    });

    expect(called).toBe(false);
  });

  test('writes configured AI variables through convex env set --force', () => {
    let args: readonly string[] = [];
    let input = '';

    syncOptionalAiEnvironment({ OPENAI_API_KEY: 'sk-test' }, (nextArgs, options = {}) => {
      args = nextArgs;
      input = options.input ?? '';
      return { status: 0, stderr: '', stdout: '' };
    });

    expect(args).toEqual(['env', 'set', '--force']);
    expect(input).toBe('OPENAI_API_KEY="sk-test"\n');
  });
});
