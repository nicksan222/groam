import { defineRule } from 'vite-plus/lint/plugins';
import type { ESTree } from 'vite-plus/lint/plugins';

/** "(optional)", "[optional]", or copy that opens with "Optional" ("Optional", "Optional: x"). */
const OPTIONAL_COPY = /\(\s*optional\s*\)|\[\s*optional\s*\]|^\s*optional\b/iu;
const COPY_ATTRIBUTES = new Set([
  'aria-label',
  'description',
  'helperText',
  'hint',
  'label',
  'placeholder',
  'title'
]);

/** Whether a string at this node is user-facing copy: JSX text, a copy attribute, or a JSX child. */
function isCopy(node: ESTree.Node): boolean {
  const parent = node.parent as ESTree.Node | null | undefined;
  if (parent?.type === 'JSXAttribute') {
    return parent.name.type === 'JSXIdentifier' && COPY_ATTRIBUTES.has(parent.name.name);
  }
  if (parent?.type !== 'JSXExpressionContainer') return false;
  const owner = parent.parent as ESTree.Node | null | undefined;
  if (owner?.type === 'JSXAttribute') {
    return owner.name.type === 'JSXIdentifier' && COPY_ATTRIBUTES.has(owner.name.name);
  }
  return owner?.type === 'JSXElement' || owner?.type === 'JSXFragment';
}

export default defineRule({
  meta: { type: 'problem' },
  create(context) {
    const message =
      'Do not write "(optional)" or "Optional" into copy, labels, or placeholders. Pass optional to FormField (or FormSection) so the mark is rendered consistently (see the build-form skill).';
    return {
      JSXText(node) {
        if (OPTIONAL_COPY.test(node.value)) context.report({ node, message });
      },
      Literal(node) {
        if (typeof node.value === 'string' && isCopy(node) && OPTIONAL_COPY.test(node.value))
          context.report({ node, message });
      }
    };
  }
});
