export function uniqueSuffix(prefix = 'e2e'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
