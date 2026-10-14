import { defineRule } from 'vite-plus/lint/plugins';
import { containsAttribute, sourceMatches, whole } from './source-text.ts';

const pageBody = whole(String.raw`<Shell\.PageBody(?:\s|/|>).*`);
const layoutOverride = whole(
  String.raw`(?:className|style|variant|innerInset|maxWidthClassName)(?:\s*=.*)?`
);

export default defineRule({
  meta: { type: 'problem' },
  create(context) {
    return {
      JSXOpeningElement(node) {
        if (
          sourceMatches(context, node, pageBody) &&
          containsAttribute(
            node,
            (attribute) =>
              attribute.type === 'JSXSpreadAttribute' ||
              sourceMatches(context, attribute, layoutOverride)
          )
        ) {
          context.report({
            node,
            message:
              'Trip and idea tabs share the default Shell.PageBody design. Remove layout overrides and spread props; change shared defaults in packages/ui.'
          });
        }
      }
    };
  }
});
