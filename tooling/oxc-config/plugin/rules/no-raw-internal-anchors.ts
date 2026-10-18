import { defineRule } from 'vite-plus/lint/plugins';
import { containsAttribute, sourceMatches, whole } from './source-text.ts';

const anchor = whole(String.raw`<a(?:\s|>).*`);
const internalHref = whole(String.raw`href\s*=\s*(?:[\x22\x27]/[^/]|\{\s*[\x22\x27\x60]/[^/]).*`);

export default defineRule({
  meta: { type: 'problem' },
  create(context) {
    return {
      JSXOpeningElement(node) {
        if (
          sourceMatches(context, node, anchor) &&
          containsAttribute(
            node,
            (attribute) =>
              attribute.type === 'JSXAttribute' && sourceMatches(context, attribute, internalHref)
          )
        ) {
          context.report({
            node,
            message:
              'Use TanStack Router Link for internal navigation. Raw anchors reload the app and discard client state.'
          });
        }
      }
    };
  }
});
