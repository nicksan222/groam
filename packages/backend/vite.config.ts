import { convexVitestConfig } from '@groam/vitest-config/convex';
import { mergeConfig } from 'vite-plus';
export default mergeConfig(convexVitestConfig, {
  test: {
    env: { OPENAI_BASE_URL: 'https://api.openai.com/v1', CONVEX_SITE_URL: 'http://127.0.0.1:3211' },
    include: ['ai/chatgpt/**/*.test.ts', 'assistant/**/*.test.ts']
  }
});
