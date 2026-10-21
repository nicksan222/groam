import { cleanEnv, str } from 'envalid';

const values = cleanEnv(process.env, {
  GROAM_ENVIRONMENT: str({ choices: ['beta', 'production'], default: 'production' })
});

/** Selects which environment in @groam/deploy/environments a Void build targets. */
export const env = { environment: values.GROAM_ENVIRONMENT as 'beta' | 'production' } as const;
