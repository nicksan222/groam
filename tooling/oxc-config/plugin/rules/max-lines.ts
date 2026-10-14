import { defineRule } from 'vite-plus/lint/plugins';
import type { ESTree } from 'vite-plus/lint/plugins';
import { lineOptionsSchema, lineStartingTokens, readLineOptions } from './line-count.ts';

// Port of Biome style/noExcessiveLinesPerFile with `skipBlankLines`.
export default defineRule({
  meta: { type: 'suggestion', schema: lineOptionsSchema },
  create(context) {
    return {
      'Program:exit'(program: ESTree.Program) {
        const { max } = readLineOptions(context, 300);
        const count = lineStartingTokens(context).length + 1;
        if (count > max) {
          context.report({
            node: program,
            message: `This file has too many lines (${count}). Maximum allowed is ${max}.`
          });
        }
      }
    };
  }
});
