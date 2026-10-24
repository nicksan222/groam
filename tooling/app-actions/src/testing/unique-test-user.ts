import { uniqueSuffix } from './unique-suffix';

export type TestUserCredentials = {
  email: string;
  name: string;
  password: string;
  username: string;
};

const defaultPassword = 'Groam-e2e-password-1234';

export function uniqueTestUser(prefix = 'e2e'): TestUserCredentials {
  const suffix = uniqueSuffix(prefix);
  return {
    email: `${suffix}@example.com`,
    name: `${prefix} User ${suffix}`,
    password: defaultPassword,
    username: suffix.replaceAll(/[^a-zA-Z0-9_.]/gu, '_').slice(0, 30)
  };
}
