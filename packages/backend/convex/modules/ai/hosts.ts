import { ConvexError } from 'convex/values';

export function isPrivateIpv4(host: string): boolean {
  const octets = host.split('.').map((part) => Number(part));
  if (!isIpv4OctetList(octets)) return false;
  const [first, second, third] = octets;
  if (first === undefined || second === undefined || third === undefined) return false;
  return isReservedIpv4Range(first, second, third);
}

function isIpv4OctetList(octets: readonly number[]): octets is [number, number, number, number] {
  return (
    octets.length === 4 &&
    octets.every((octet) => Number.isInteger(octet) && octet >= 0 && octet <= 255)
  );
}

function isReservedIpv4Range(first: number, second: number, third: number): boolean {
  if ([0, 10, 127].includes(first) || first >= 224) return true;
  if (first === 100) return second >= 64 && second <= 127;
  if (first === 169) return second === 254;
  if (first === 172) return second >= 16 && second <= 31;
  if (first === 192) {
    return (
      (second === 0 && [0, 2].includes(third)) || (second === 88 && third === 99) || second === 168
    );
  }
  if (first === 198) return [18, 19].includes(second) || (second === 51 && third === 100);
  return first === 203 && second === 0 && third === 113;
}

function ipv4FromMappedHost(host: string): string | undefined {
  if (!host.startsWith('::ffff:')) return undefined;
  const rest = host.slice('::ffff:'.length);
  if (isPrivateIpv4(rest) || rest.includes('.')) return rest;
  const hextets = rest.split(':');
  if (hextets.length !== 2) return undefined;
  const high = Number.parseInt(hextets[0] ?? '', 16);
  const low = Number.parseInt(hextets[1] ?? '', 16);
  if (
    !Number.isInteger(high) ||
    !Number.isInteger(low) ||
    high < 0 ||
    high > 0xffff ||
    low < 0 ||
    low > 0xffff
  ) {
    return undefined;
  }
  return `${(high >> 8) & 0xff}.${high & 0xff}.${(low >> 8) & 0xff}.${low & 0xff}`;
}

export function isPrivateNetworkHostname(hostname: string): boolean {
  const host = hostname
    .replace(/^\[|\]$/gu, '')
    .replace(/\.$/u, '')
    .toLowerCase();
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host === '::1' ||
    host === '::' ||
    host === '0.0.0.0'
  ) {
    return true;
  }
  if (host.includes(':') && host.split(':').every((part) => part === '' || part === '0')) {
    return true;
  }
  const mapped = ipv4FromMappedHost(host);
  if (mapped) return isPrivateIpv4(mapped);
  if (isPrivateIpv4(host)) return true;
  if (!host.includes(':')) return false;
  return !isGlobalUnicastIpv6(host);
}

function isGlobalUnicastIpv6(host: string): boolean {
  const hextets = parseIpv6Hextets(host);
  if (!hextets) return false;
  const [first, second, third] = hextets;
  if (first === undefined || second === undefined) return false;
  if (first < 0x2000 || first > 0x3fff) return false;
  if (first === 0x2002) return false;
  // 3fff::/20 is documentation space (RFC 9637), not globally reachable.
  if (first === 0x3fff && second <= 0x0fff) return false;
  if (first !== 0x2001) return true;
  if (second === 0 || second === 0xdb8) return false;
  // 2001:2::/48 is the IPv6 benchmarking prefix (RFC 5180).
  if (second === 2 && (third ?? 0) === 0) return false;
  return second < 0x10 || second > 0x2f;
}

function parseIpv6Hextets(host: string): number[] | undefined {
  const sections = host.split('::');
  if (sections.length > 2) return undefined;
  const parseGroup = (value: string | undefined) => {
    if (!value) return [];
    return value.split(':').map((part) => Number.parseInt(part, 16));
  };
  const head = parseGroup(sections[0]);
  const tail = sections.length === 2 ? parseGroup(sections[1]) : [];
  if ([...head, ...tail].some((part) => !Number.isInteger(part) || part < 0 || part > 0xffff)) {
    return undefined;
  }
  const missing = 8 - head.length - tail.length;
  if (sections.length === 1) {
    return head.length === 8 ? head : undefined;
  }
  if (missing < 0) return undefined;
  return [...head, ...Array.from({ length: missing }, () => 0), ...tail];
}

export function resolvedAddressIsPrivate(address: string): boolean {
  return isPrivateNetworkHostname(address) || isPrivateIpv4(address);
}

export function normalizeCompatibleBaseUrl(
  value: string | undefined,
  required: boolean,
  localMode: boolean
) {
  const trimmed = value?.trim();
  if (!trimmed) {
    if (required) throw new ConvexError('Paste the OpenAI-compatible base URL.');
    return undefined;
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new ConvexError('The OpenAI-compatible base URL is not a valid URL.');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new ConvexError('The OpenAI-compatible base URL must use http or https.');
  }
  if (!localMode && parsed.protocol !== 'https:') {
    throw new ConvexError('Hosted OpenAI-compatible URLs must use https.');
  }
  if (!localMode && isPrivateNetworkHostname(parsed.hostname)) {
    throw new ConvexError(
      'Private and loopback OpenAI-compatible URLs are only allowed when Groam runs locally.'
    );
  }
  if (!localMode && !isIpLiteralHostname(parsed.hostname)) {
    throw new ConvexError(
      'Custom OpenAI-compatible hostnames are only allowed when Groam runs locally.'
    );
  }
  return parsed.origin + parsed.pathname.replace(/\/$/u, '');
}

export function isIpLiteralHostname(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/gu, '');
  if (isPrivateIpv4(host)) return true;
  const octets = host.split('.').map((part) => Number(part));
  if (
    octets.length === 4 &&
    octets.every((octet) => Number.isInteger(octet) && octet >= 0 && octet <= 255)
  ) {
    return true;
  }
  return parseIpv6Hextets(host) !== undefined;
}
