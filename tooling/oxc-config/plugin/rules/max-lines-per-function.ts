import { defineRule } from 'vite-plus/lint/plugins';
import type { ESTree } from 'vite-plus/lint/plugins';
import type { Token } from './line-count.ts';
import { lineOptionsSchema, lineStartingTokens, readLineOptions } from './line-count.ts';

// Port of Biome complexity/noExcessiveLinesPerFunction with `skipBlankLines`. Biome scores
// functions, methods, and constructors (not getters or setters) and ignores brace tokens.

type FunctionNode = ESTree.ArrowFunctionExpression | ESTree.Function;

function isAccessor(node: FunctionNode): boolean {
  const kind = node.parent && 'kind' in node.parent ? node.parent.kind : undefined;
  return kind === 'get' || kind === 'set';
}

function isIife(node: FunctionNode): boolean {
  return node.parent?.type === 'CallExpression' && node.parent.callee === node;
}

function isBrace(token: Token): boolean {
  return token.type === 'Punctuator' && (token.value === '{' || token.value === '}');
}

export default defineRule({
  meta: { type: 'suggestion', schema: lineOptionsSchema },
  create(context) {
    let starts: Token[] | undefined;
    const check = (node: FunctionNode) => {
      const { max, skipIifes } = readLineOptions(context, 50);
      if (!node.body || isAccessor(node) || (skipIifes && isIife(node))) return;
      starts ??= lineStartingTokens(context);
      const { start, end } = node.body;
      const count = starts.filter(
        (token) => token.start >= start && token.end <= end && !isBrace(token)
      ).length;
      if (count > max) {
        context.report({
          node,
          message: `This function has too many lines (${count}). Maximum allowed is ${max}.`
        });
      }
    };
    return {
      ArrowFunctionExpression: check,
      FunctionDeclaration: check,
      FunctionExpression: check
    };
  }
});
