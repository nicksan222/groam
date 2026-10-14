import { defineConfig } from 'vite-plus';
import { fmt } from './tooling/oxc-config/fmt.ts';
import { lint } from './tooling/oxc-config/lint.ts';

export default defineConfig({
  fmt,
  lint,
  staged: {
    '*': 'vp check --fix --no-error-on-unmatched-pattern'
  }
});
