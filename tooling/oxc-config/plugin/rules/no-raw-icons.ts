import { defineRule } from 'vite-plus/lint/plugins';
import type { ESTree } from 'vite-plus/lint/plugins';

// Include subpaths so imports cannot bypass the facade through a provider's internals.
const providers =
  /^(?:lucide(?:-[\w-]+)?|react-icons|@(?:lucide|heroicons|tabler|phosphor-icons|iconify|fortawesome)\/[^/]+|@radix-ui\/react-icons)(?:\/|$)/u;
const message =
  'Import icons and icon types from @groam/icons. Add new icons to that package instead of using an icon library or inline SVG directly.';

export default defineRule({
  meta: {
    type: 'problem',
    schema: [
      {
        type: 'object',
        properties: { allowSvg: { type: 'boolean' } },
        additionalProperties: false
      }
    ]
  },
  create(context) {
    const options: unknown = context.options[0];
    const allowSvg =
      typeof options === 'object' && options !== null && Reflect.get(options, 'allowSvg') === true;
    const checkSource = (node: ESTree.Node) => {
      if (node.type === 'Literal' && typeof node.value === 'string' && providers.test(node.value)) {
        context.report({ node, message });
      }
    };
    return {
      ImportDeclaration(node) {
        checkSource(node.source);
      },
      ExportNamedDeclaration(node) {
        if (node.source) checkSource(node.source);
      },
      ExportAllDeclaration(node) {
        checkSource(node.source);
      },
      ImportExpression(node) {
        checkSource(node.source);
      },
      CallExpression(node) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require' &&
          node.arguments[0]
        ) {
          checkSource(node.arguments[0]);
        }
      },
      Literal(node) {
        if (!allowSvg && typeof node.value === 'string' && /<svg(?:\s[^>]*|)>/u.test(node.value)) {
          context.report({ node, message });
        }
      },
      TemplateElement(node) {
        if (!allowSvg && /<svg(?:\s[^>]*|)>/u.test(node.value.raw)) {
          context.report({ node, message });
        }
      },
      JSXOpeningElement(node) {
        if (!allowSvg && node.name.type === 'JSXIdentifier' && node.name.name === 'svg') {
          context.report({ node, message });
        }
      }
    };
  }
});
