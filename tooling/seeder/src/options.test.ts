import { describe, expect, test } from 'vite-plus/test';
import { parseSeedOptions, seedUsage } from './options';

describe('parseSeedOptions', () => {
  test('defaults to a resetting seed', () => {
    expect(parseSeedOptions([])).toEqual({ reset: true });
  });

  test('accepts concurrency in both argument formats', () => {
    expect(parseSeedOptions(['--concurrency', '7', '--no-reset'])).toEqual({
      concurrency: 7,
      reset: false
    });
    expect(parseSeedOptions(['--concurrency=3'])).toEqual({ concurrency: 3, reset: true });
  });

  test('rejects unsupported options and malformed values', () => {
    expect(() => parseSeedOptions(['--prod'])).toThrow('Unknown seeder option: --prod');
    expect(() => parseSeedOptions(['--scale', 'large'])).toThrow('Unknown seeder option: --scale');
    expect(() => parseSeedOptions(['--concurrency', '1e2'])).toThrow(
      '--concurrency requires a whole number'
    );
    expect(() => parseSeedOptions(['--concurrency', '21'])).toThrow(
      'Concurrency must be a whole number between 1 and 20'
    );
  });

  test('prints help without parsing other options', () => {
    expect(parseSeedOptions(['--help'])).toEqual({ help: true });
    expect(parseSeedOptions(['-h', '--concurrency', 'nope'])).toEqual({ help: true });
    expect(seedUsage).toContain('--no-reset');
  });
});
