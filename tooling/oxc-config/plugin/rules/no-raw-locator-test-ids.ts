import { nodeTextRule, whole } from './source-text.ts';

// Matches `x.getByTestId('…')`, the Playwright `by(page, '…')` and the browser-mode `by('…')`
// helpers; template literals that compose a shared id (`${ids.dialog}-submit`) are allowed.
export default nodeTextRule(
  ['CallExpression'],
  whole(String.raw`(?:.*\.getByTestId\s*\(\s*[\x22\x27]|by\s*\(\s*(?:[^,]+,\s*)?[\x22\x27]).*`),
  'Use ids from @groam/app-actions/ids for browser test locators instead of a raw test-ID string.'
);
