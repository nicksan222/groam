export function uniqueSuffix(prefix = 'e2e'): string {
  return `${prefix}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
}
