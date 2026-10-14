import { nodeTextRule, whole } from './source-text.ts';

export default nodeTextRule(
  ['JSXOpeningElement'],
  whole(String.raw`<(?:button|input|select|textarea)(?:\s|/|>).*`),
  'Use an exported @groam/ui component instead of a native interactive element. Shared controls centralize accessibility, states, styling, and test behavior.'
);
