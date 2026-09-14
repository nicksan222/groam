export function withNodeEnvFlags<T extends { NODE_ENV: string }>(
  baseEnv: T
): T & { isDev: boolean; isProduction: boolean; isTest: boolean } {
  return {
    ...baseEnv,
    get isDev() {
      return baseEnv.NODE_ENV !== 'production';
    },
    get isProduction() {
      return baseEnv.NODE_ENV === 'production';
    },
    get isTest() {
      return baseEnv.NODE_ENV === 'test';
    }
  };
}
