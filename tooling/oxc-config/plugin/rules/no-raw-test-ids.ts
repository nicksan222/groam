import { nodeTextRule, whole } from './source-text.ts';

export default nodeTextRule(
  ['JSXAttribute'],
  whole(
    String.raw`data-testid\s*=\s*(?:\x22[^\x22]*\x22|\x27[^\x27]*\x27|\{\s*(?:\x22[^\x22]*\x22|\x27[^\x27]*\x27|\x60.*\x60)\s*\})\s*`
  ),
  'Use testIds from @/lib/test-ids instead of an inline data-testid string. Centralized IDs keep component tests and browser actions in sync.'
);
