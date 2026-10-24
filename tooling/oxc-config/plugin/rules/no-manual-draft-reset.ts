import { defineRule } from 'vite-plus/lint/plugins';
import type { ESTree } from 'vite-plus/lint/plugins';
import { calleeName } from './form-ast.ts';

const effects = new Set(['useEffect', 'useLayoutEffect']);
const openName = /^(?:open|isOpen|\w*Open)$/u;
const timers = new Set(['setTimeout', 'setInterval', 'setImmediate']);

function isOpenDependency(element: ESTree.Node | null): boolean {
  if (element?.type === 'Identifier') return openName.test(element.name);
  return (
    element?.type === 'MemberExpression' &&
    !element.computed &&
    element.property.type === 'Identifier' &&
    openName.test(element.property.name)
  );
}

/** The effect's own statements: the body plus the branches of `if`s, never nested callbacks. */
function* directStatements(node: ESTree.Node | null | undefined): Generator<ESTree.Node> {
  if (!node) return;
  if (node.type === 'BlockStatement') {
    for (const statement of node.body) yield* directStatements(statement);
  } else if (node.type === 'IfStatement') {
    yield* directStatements(node.consequent);
    yield* directStatements(node.alternate);
  } else {
    yield node;
  }
}

/** `setX(...)`, `reset()`, `form.reset()`, or `dispatch({ type: 'reset…' })`. */
function isReset(statement: ESTree.Node): boolean {
  const call =
    statement.type === 'ExpressionStatement' ? statement.expression : (statement as ESTree.Node);
  if (call.type !== 'CallExpression') return false;
  const name = calleeName(call);
  if (!name) return false;
  if (call.callee.type === 'Identifier' && /^set[A-Z]/u.test(name)) return !timers.has(name);
  if (name === 'reset' || name === 'resetForm') return true;
  const [action] = call.arguments;
  return (
    name === 'dispatch' &&
    action?.type === 'ObjectExpression' &&
    action.properties.some(
      (property) =>
        property.type === 'Property' &&
        property.key.type === 'Identifier' &&
        property.key.name === 'type' &&
        property.value.type === 'Literal' &&
        /reset/iu.test(String(property.value.value))
    )
  );
}

/** An effect keyed on `open` that resets state: a hand-synced draft reset. */
/** The top-level statements of an effect callback; an expression body counts as one. */
function effectStatements(effect: ESTree.ArrowFunctionExpression | ESTree.Function): ESTree.Node[] {
  if (!effect.body) return [];
  return effect.body.type === 'BlockStatement'
    ? [...directStatements(effect.body)]
    : [{ type: 'ExpressionStatement', expression: effect.body } as ESTree.Node];
}

export default defineRule({
  meta: { type: 'problem' },
  create(context) {
    return {
      CallExpression(node) {
        const [effect, dependencies] = node.arguments;
        if (!effects.has(calleeName(node) ?? '')) return;
        if (dependencies?.type !== 'ArrayExpression') return;
        if (effect?.type !== 'ArrowFunctionExpression' && effect?.type !== 'FunctionExpression')
          return;
        if (!dependencies.elements.some((element) => isOpenDependency(element))) return;
        if (effectStatements(effect).some((statement) => isReset(statement))) {
          context.report({
            node,
            message:
              'Do not reset or sync a draft in an effect keyed on open. Wrap the form in a component that calls useOpenSession(open) (@groam/ui/hooks/use-open-session) and render the stateful form with key={session}, so every opening starts fresh (see the build-form skill).'
          });
        }
      }
    };
  }
});
