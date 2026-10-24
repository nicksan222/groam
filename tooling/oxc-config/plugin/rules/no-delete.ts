import { defineRule } from 'vite-plus/lint/plugins';
import type { ESTree } from 'vite-plus/lint/plugins';

// Port of Biome performance/noDelete. Like Biome, it allows map-like deletes through computed
// non-literal keys and `delete process.env.NAME`.

function isProcessEnv(node: ESTree.Node): boolean {
  return (
    node.type === 'MemberExpression' &&
    !node.computed &&
    node.object.type === 'Identifier' &&
    node.object.name === 'process' &&
    node.property.type === 'Identifier' &&
    node.property.name === 'env'
  );
}

function isAllowedTarget(target: ESTree.Node): boolean {
  if (target.type === 'ChainExpression') return isAllowedTarget(target.expression);
  if (target.type !== 'MemberExpression') return false;
  if (target.computed && target.property.type !== 'Literal') return true;
  return isProcessEnv(target.object);
}

export default defineRule({
  meta: { type: 'problem' },
  create(context) {
    return {
      UnaryExpression(node) {
        if (node.operator === 'delete' && !isAllowedTarget(node.argument)) {
          context.report({
            node,
            message:
              'Avoid the delete operator. Assign undefined, or build a new object without the key.'
          });
        }
      }
    };
  }
});
