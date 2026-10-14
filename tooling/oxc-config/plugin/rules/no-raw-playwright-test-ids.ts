import { nodeTextRule, whole } from './source-text.ts';

export default nodeTextRule(
  ['CallExpression'],
  whole(String.raw`(?:.*\.getByTestId\s*\(\s*[\x22\x27]|by\s*\([^,]+,\s*[\x22\x27]).*`),
  'Use ids from @groam/app-actions/playwright for browser test locators instead of a raw test-ID string.'
);
