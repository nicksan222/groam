import { defineRule } from 'vite-plus/lint/plugins';
import type { ESTree } from 'vite-plus/lint/plugins';
import { isFunction, jsxName, mentionsPending } from './form-ast.ts';

/** "Saving…", "Applying…", "Adding to trip…": a gerund, optionally more words, then an ellipsis. */
const PENDING_TEXT = /^\s*[A-Z][a-z]+ing(?:\s[\w’'-]+){0,3}\s?(?:…|\.\.\.)\s*$/u;
const BUTTON_ELEMENTS = new Set(['Button', 'AlertDialogAction', 'DialogClose']);

/**
 * Pending copy swapped into a control: either text inside a button, or a branch of a conditional
 * keyed on a pending-ish value (`pending ? 'Applying…' : 'Apply'`, wherever the result goes).
 * Status text that is not a button label (`<span role="status">Uploading…</span>`) is unaffected.
 */
function isPendingCopy(node: ESTree.Node): boolean {
  let current: ESTree.Node | null | undefined = node;
  let child: ESTree.Node = node;
  while (current) {
    if (isFunction(current)) return false;
    // Status text for a live region is not a button label.
    if (current.type === 'JSXElement' && isLiveRegion(current)) return false;
    if (
      current.type === 'ConditionalExpression' &&
      current.test !== child &&
      PENDING_TEST.has(current)
    )
      return true;
    if (current.type === 'JSXElement' && BUTTON_ELEMENTS.has(jsxName(current.openingElement.name)))
      return true;
    child = current;
    current = current.parent as ESTree.Node | undefined;
  }
  return false;
}

function isLiveRegion(element: ESTree.JSXElement): boolean {
  return element.openingElement.attributes.some(
    (attribute) =>
      attribute.type === 'JSXAttribute' &&
      attribute.name.type === 'JSXIdentifier' &&
      (attribute.name.name === 'aria-live' ||
        (attribute.name.name === 'role' &&
          attribute.value?.type === 'Literal' &&
          ['alert', 'log', 'status'].includes(String(attribute.value.value))))
  );
}

const PENDING_TEST = new WeakSet<ESTree.Node>();

export default defineRule({
  meta: { type: 'problem' },
  create(context) {
    const message =
      'Do not swap a control’s label for pending copy ("Saving…"). Keep the label and put `pending` on the Button (or `isPending` on FormActions): the spinner, disabled state and screen-reader status come with it (see the build-form skill). Status text that is not a button label is unaffected.';
    const check = (node: ESTree.Node, text: string) => {
      if (PENDING_TEXT.test(text) && isPendingCopy(node)) context.report({ node, message });
    };
    return {
      ConditionalExpression(node) {
        if (mentionsPending(context.sourceCode.getText(node.test))) PENDING_TEST.add(node);
      },
      JSXText(node) {
        check(node, node.value);
      },
      Literal(node) {
        if (typeof node.value === 'string' && node.parent?.type !== 'ImportDeclaration')
          check(node, node.value);
      },
      TemplateLiteral(node) {
        if (node.expressions.length === 0) check(node, node.quasis[0]?.value.cooked ?? '');
      }
    };
  }
});
