import { nodeTextRule, whole } from './source-text.ts';

export default nodeTextRule(
  ['CallExpression'],
  whole(String.raw`window\.(?:alert|confirm|prompt)\s*\(.*`),
  'Use the app dialog abstraction instead of window.alert, window.confirm, or window.prompt. Native dialogs block the browser and bypass Groam UI behavior.'
);
