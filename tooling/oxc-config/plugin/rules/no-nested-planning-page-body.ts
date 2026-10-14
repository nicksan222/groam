import { nodeTextRule, whole } from './source-text.ts';

export default nodeTextRule(
  ['JSXOpeningElement'],
  whole(String.raw`<Shell\.PageBody(?:\s|/|>).*`),
  'TripPageShell already provides the page body. Render tab content directly instead of adding another Shell.PageBody and doubling page padding.'
);
