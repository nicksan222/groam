export function clientEnvString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}
