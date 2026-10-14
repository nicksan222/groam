import { defineRule } from 'vite-plus/lint/plugins';

// Replaces Biome performance/noReExportAll: keep public entrypoints explicit.
export default defineRule({
  meta: { type: 'problem' },
  create(context) {
    return {
      ExportAllDeclaration(node) {
        context.report({
          node,
          message: 'Export the public names explicitly instead of re-exporting everything.'
        });
      }
    };
  }
});
