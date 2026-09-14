import { describe, expect, test } from 'vitest';
import { parseSeedOptions, seedUsage } from './options';

describe('parseSeedOptions', () => {
  test('defaults to a resettable realistic scenario', () => {
    expect(parseSeedOptions([])).toEqual({ reset: true, scale: 'realistic' });
  });

  test('accepts scale and bounded-count overrides in both argument formats', () => {
    expect(
      parseSeedOptions([
        '--scale=large',
        '--users',
        '75',
        '--trips=120',
        '--concurrency',
        '7',
        '--no-reset'
      ])
    ).toEqual({
      concurrency: 7,
      reset: false,
      scale: 'large',
      tripCount: 120,
      userCount: 75
    });
  });

  test('rejects unsupported options and malformed values', () => {
    expect(() => parseSeedOptions(['--prod'])).toThrow('Unknown seeder option: --prod');
    expect(() => parseSeedOptions(['--scale', 'huge'])).toThrow(
      '--scale must be one of: small, realistic, large'
    );
    expect(() => parseSeedOptions(['--users', 'many'])).toThrow('--users requires a whole number');
    expect(() => parseSeedOptions(['--users', '1e2'])).toThrow('--users requires a whole number');
    expect(() => parseSeedOptions(['--trips', '8.0'])).toThrow('--trips requires a whole number');
    expect(() => parseSeedOptions(['--users', '0'])).toThrow(
      'User count must be a whole number between 1 and 100'
    );
    expect(() => parseSeedOptions(['--trips', '1001'])).toThrow(
      'Trip count must be a whole number between 0 and 1000'
    );
    expect(() => parseSeedOptions(['--concurrency', '21'])).toThrow(
      'Concurrency must be a whole number between 1 and 20'
    );
  });

  test('prints help without parsing other options', () => {
    expect(parseSeedOptions(['--help'])).toEqual({ help: true });
    expect(parseSeedOptions(['-h', '--users', 'nope'])).toEqual({ help: true });
    expect(seedUsage).toContain('--no-reset');
  });
});
