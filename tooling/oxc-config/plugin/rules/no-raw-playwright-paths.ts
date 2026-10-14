import { nodeTextRule, whole } from './source-text.ts';

export default nodeTextRule(
  ['CallExpression'],
  whole(String.raw`.*\.goto\s*\(\s*[\x22\x27\x60]/.*`),
  'Wrap internal Playwright paths with appHref, or use a reusable app action, so navigation respects the configured app base.'
);
