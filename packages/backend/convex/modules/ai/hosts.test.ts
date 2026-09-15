import { describe, expect, test } from 'vitest';
import {
  isPrivateNetworkHostname,
  normalizeCompatibleBaseUrl,
  resolvedAddressIsPrivate
} from './hosts';

describe('private compatible AI hosts', () => {
  test('detects loopback, link-local, and RFC1918 hosts', () => {
    expect(isPrivateNetworkHostname('127.0.0.1')).toBe(true);
    expect(isPrivateNetworkHostname('localhost')).toBe(true);
    expect(isPrivateNetworkHostname('169.254.169.254')).toBe(true);
    expect(isPrivateNetworkHostname('10.0.0.12')).toBe(true);
    expect(isPrivateNetworkHostname('192.168.1.20')).toBe(true);
    expect(isPrivateNetworkHostname('100.64.1.2')).toBe(true);
    expect(isPrivateNetworkHostname('198.18.0.1')).toBe(true);
    expect(isPrivateNetworkHostname('198.51.100.1')).toBe(true);
    expect(isPrivateNetworkHostname('203.0.113.1')).toBe(true);
    expect(isPrivateNetworkHostname('224.0.0.1')).toBe(true);
    expect(isPrivateNetworkHostname('172.16.0.2')).toBe(true);
    expect(isPrivateNetworkHostname('::1')).toBe(true);
    expect(isPrivateNetworkHostname('::')).toBe(true);
    expect(isPrivateNetworkHostname('[::]')).toBe(true);
    expect(isPrivateNetworkHostname('fe80::1')).toBe(true);
    expect(isPrivateNetworkHostname('[::ffff:7f00:1]')).toBe(true);
    expect(isPrivateNetworkHostname('[::ffff:a9fe:a9fe]')).toBe(true);
    expect(isPrivateNetworkHostname('localhost.')).toBe(true);
    expect(isPrivateNetworkHostname('fd12:3456::1')).toBe(true);
    expect(isPrivateNetworkHostname('fec0::1')).toBe(true);
    expect(isPrivateNetworkHostname('2001:db8::1')).toBe(true);
    expect(isPrivateNetworkHostname('2001::1')).toBe(true);
    expect(isPrivateNetworkHostname('3fff::1')).toBe(true);
    expect(isPrivateNetworkHostname('[3fff:0fff::1]')).toBe(true);
    expect(isPrivateNetworkHostname('2001:2::1')).toBe(true);
  });

  test('allows public hostnames', () => {
    expect(isPrivateNetworkHostname('api.openai.com')).toBe(false);
    expect(isPrivateNetworkHostname('8.8.8.8')).toBe(false);
    expect(isPrivateNetworkHostname('172.32.0.1')).toBe(false);
    expect(isPrivateNetworkHostname('2606:4700::1')).toBe(false);
    expect(resolvedAddressIsPrivate('8.8.8.8')).toBe(false);
    expect(resolvedAddressIsPrivate('127.0.0.1')).toBe(true);
  });

  test('saves loopback URLs only in local mode', () => {
    expect(normalizeCompatibleBaseUrl('http://127.0.0.1:11434/v1', true, true)).toBe(
      'http://127.0.0.1:11434/v1'
    );
    expect(() => normalizeCompatibleBaseUrl('http://127.0.0.1:11434/v1', true, false)).toThrow(
      'Hosted OpenAI-compatible URLs must use https.'
    );
    expect(() => normalizeCompatibleBaseUrl('http://8.8.8.8/v1', true, false)).toThrow(
      'Hosted OpenAI-compatible URLs must use https.'
    );
    expect(() =>
      normalizeCompatibleBaseUrl('http://[::ffff:127.0.0.1]:11434/v1', true, false)
    ).toThrow('Hosted OpenAI-compatible URLs must use https.');
    expect(() =>
      normalizeCompatibleBaseUrl('http://[::ffff:169.254.169.254]/v1', true, false)
    ).toThrow('Hosted OpenAI-compatible URLs must use https.');
    expect(() => normalizeCompatibleBaseUrl('http://100.64.1.2:11434/v1', true, false)).toThrow(
      'Hosted OpenAI-compatible URLs must use https.'
    );
    expect(() => normalizeCompatibleBaseUrl('http://198.18.0.1/v1', true, false)).toThrow(
      'Hosted OpenAI-compatible URLs must use https.'
    );
    expect(() => normalizeCompatibleBaseUrl('http://[2001:db8::1]/v1', true, false)).toThrow(
      'Hosted OpenAI-compatible URLs must use https.'
    );
    expect(() => normalizeCompatibleBaseUrl('http://[fec0::1]/v1', true, false)).toThrow(
      'Hosted OpenAI-compatible URLs must use https.'
    );
    expect(() => normalizeCompatibleBaseUrl('http://[2001::1]/v1', true, false)).toThrow(
      'Hosted OpenAI-compatible URLs must use https.'
    );
    expect(() => normalizeCompatibleBaseUrl('http://[3fff::1]/v1', true, false)).toThrow(
      'Hosted OpenAI-compatible URLs must use https.'
    );
    expect(() => normalizeCompatibleBaseUrl('http://[2001:2::1]/v1', true, false)).toThrow(
      'Hosted OpenAI-compatible URLs must use https.'
    );
    expect(() => normalizeCompatibleBaseUrl('http://localhost.:11434/v1', true, false)).toThrow(
      'Hosted OpenAI-compatible URLs must use https.'
    );
    expect(() =>
      normalizeCompatibleBaseUrl('https://[::ffff:127.0.0.1]:11434/v1', true, false)
    ).toThrow(
      'Private and loopback OpenAI-compatible URLs are only allowed when Groam runs locally.'
    );
    expect(() => normalizeCompatibleBaseUrl('https://[3fff::1]/v1', true, false)).toThrow(
      'Private and loopback OpenAI-compatible URLs are only allowed when Groam runs locally.'
    );
    expect(() => normalizeCompatibleBaseUrl('https://[2001:2::1]/v1', true, false)).toThrow(
      'Private and loopback OpenAI-compatible URLs are only allowed when Groam runs locally.'
    );
    expect(() => normalizeCompatibleBaseUrl('https://llm.example.com/v1', true, false)).toThrow(
      'Custom OpenAI-compatible hostnames are only allowed when Groam runs locally.'
    );
    expect(normalizeCompatibleBaseUrl('https://8.8.8.8/v1', true, false)).toBe(
      'https://8.8.8.8/v1'
    );
    expect(normalizeCompatibleBaseUrl('https://llm.example.com/v1', true, true)).toBe(
      'https://llm.example.com/v1'
    );
  });
});
