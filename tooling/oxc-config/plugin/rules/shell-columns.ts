import { defineRule } from 'vite-plus/lint/plugins';
import { containsAttribute, sourceMatches, whole } from './source-text.ts';

const legacySplit = whole(
  String.raw`<Shell\.(?:Split(?:\.(?:Main|Aside))?|SplitMain|SplitAside)(?:\s|/|>).*`
);
const column = whole(
  String.raw`<Shell\.(?:TwoColumns|LeftColumn|RightColumn|DesktopRightColumn)(?:\s|/|>).*`
);
const columnOverride = whole(
  String.raw`(?:className|style|rightWidth|gap|breakpoint|stack|sticky|order|mobileDivider)(?:\s*=.*)?`
);
const adHocColumns = whole(String.raw`className\s*=.*grid-cols-\[minmax\(0,1fr\)_[^\s\]_]+\].*`);

export default defineRule({
  meta: { type: 'problem' },
  create(context) {
    return {
      JSXAttribute(node) {
        if (sourceMatches(context, node, adHocColumns)) {
          context.report({
            node,
            message:
              'Use Shell.TwoColumns with LeftColumn and RightColumn for primary/supporting page layouts. Define reusable column geometry in packages/ui.'
          });
        }
      },
      JSXOpeningElement(node) {
        if (sourceMatches(context, node, legacySplit)) {
          context.report({
            node,
            message:
              'Use Shell.TwoColumns, Shell.LeftColumn and Shell.RightColumn. The legacy split API is reserved for compatibility inside packages/ui.'
          });
        } else if (
          sourceMatches(context, node, column) &&
          containsAttribute(
            node,
            (attribute) =>
              attribute.type === 'JSXSpreadAttribute' ||
              sourceMatches(context, attribute, columnOverride)
          )
        ) {
          context.report({
            node,
            message:
              'Shell columns share one design by default. Do not override the scaffold with layout props, className, style or spread props; put content inside the named columns.'
          });
        }
      }
    };
  }
});
