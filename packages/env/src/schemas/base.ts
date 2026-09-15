import { bool, str } from 'envalid';

export const baseSchema = {
  BUN_ENV: str({
    choices: ['development', 'test', 'production', 'staging', ''],
    default: ''
  }),
  CI: bool({ default: false, desc: 'Running in CI' }),
  NODE_ENV: str({
    choices: ['development', 'test', 'production', 'staging'],
    default: 'development'
  })
};
