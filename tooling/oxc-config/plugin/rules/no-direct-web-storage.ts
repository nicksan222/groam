import { defineRule } from 'vite-plus/lint/plugins';
import { sourceMatches, whole } from './source-text.ts';

const pattern = whole(String.raw`(?:window\.)?(?:localStorage|sessionStorage)(?:\.|\s*\(|$).*`);
const message =
  'Access browser storage through a feature store or shared adapter. Direct storage calls scatter persistence, validation, and test setup across components.';

export default defineRule({
  meta: { type: 'problem' },
  create(context) {
    return {
      CallExpression(node) {
        if (sourceMatches(context, node, pattern)) context.report({ node, message });
      },
      MemberExpression(node) {
        if (!node.computed && sourceMatches(context, node, pattern)) {
          context.report({ node, message });
        }
      }
    };
  }
});
