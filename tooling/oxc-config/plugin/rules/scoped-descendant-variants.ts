import { nodeTextRule, whole } from './source-text.ts';

export default nodeTextRule(
  ['JSXAttribute'],
  whole(String.raw`className\s*=.*(?:\s|\x22|\x27|\x60|:)has-data-\[variant=.*`),
  'Scope descendant variant selectors to a component data-slot. A generic has-data-[variant=...] selector also matches unrelated cards and can change the whole page.'
);
