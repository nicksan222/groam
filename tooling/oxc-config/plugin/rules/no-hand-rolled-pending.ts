import { defineRule } from 'vite-plus/lint/plugins';
import type { ESTree } from 'vite-plus/lint/plugins';
import {
  type AnyFunction,
  calleeName,
  descendants,
  enclosingFunction,
  isPendingName
} from './form-ast.ts';

const effects = new Set(['useEffect', 'useLayoutEffect']);
const setter = /^set[A-Z]/u;

type Flag = { kind: 'ref' | 'state'; name: string };

function booleanOf(node: ESTree.Node | null | undefined): boolean | undefined {
  return node?.type === 'Literal' && typeof node.value === 'boolean' ? node.value : undefined;
}

function objectFlag(node: ESTree.ObjectExpression): boolean | undefined {
  for (const property of node.properties) {
    if (property.type === 'Property') {
      const value = booleanOf(property.value as ESTree.Node);
      if (value !== undefined) return value;
    }
  }
  return undefined;
}

function isEmptyValue(node: ESTree.Node | null | undefined): boolean {
  return (
    (node?.type === 'Literal' && node.value === null) ||
    (node?.type === 'Identifier' && node.name === 'undefined')
  );
}

/** The value written to a flag, as `true` (busy), `false` (idle), or `undefined` (something else). */
function writes(node: ESTree.Node | null | undefined, name: string): boolean | undefined {
  const flag = booleanOf(node);
  if (flag !== undefined) return flag;
  if (isEmptyValue(node)) return false;
  if (node?.type === 'ObjectExpression') return objectFlag(node);
  // `setPendingId(id)`: any non-empty value on a pending-named setter means busy.
  return node && isPendingName(name) ? true : undefined;
}

type Write = { busy: boolean; name: string; node: ESTree.Node };

/** `setX(value)` or `ref.current = value` on a flag declared in this file. */
function writeOf(node: ESTree.Node, flags: Map<string, Flag>): Write | undefined {
  if (
    node.type === 'CallExpression' &&
    node.callee.type === 'Identifier' &&
    setter.test(node.callee.name) &&
    flags.get(node.callee.name)?.kind === 'state'
  ) {
    const busy = writes(node.arguments[0] as ESTree.Node | undefined, node.callee.name);
    return busy === undefined ? undefined : { busy, name: node.callee.name, node };
  }
  if (
    node.type === 'AssignmentExpression' &&
    node.left.type === 'MemberExpression' &&
    !node.left.computed &&
    node.left.object.type === 'Identifier' &&
    node.left.property.type === 'Identifier' &&
    node.left.property.name === 'current' &&
    flags.get(node.left.object.name)?.kind === 'ref'
  ) {
    const busy = booleanOf(node.right);
    return busy === undefined ? undefined : { busy, name: node.left.object.name, node };
  }
  return undefined;
}

/** `await x` or a `.then/.catch/.finally` call: the point after which the action has not finished. */
function asyncPoint(node: ESTree.Node): number | undefined {
  if (node.type === 'AwaitExpression') return node.start;
  if (
    node.type === 'CallExpression' &&
    node.callee.type === 'MemberExpression' &&
    !node.callee.computed &&
    node.callee.property.type === 'Identifier' &&
    ['then', 'catch', 'finally'].includes(node.callee.property.name)
  )
    return node.callee.property.start;
  return undefined;
}

/** Flags declared in this file: `[x, setX] = useState(false | null | {...})`, `ref = useRef(false)`. */
function declaredFlags(program: ESTree.Program): Map<string, Flag> {
  const flags = new Map<string, Flag>();
  for (const node of descendants(program)) {
    if (node.type !== 'VariableDeclarator' || node.init?.type !== 'CallExpression') continue;
    const hook = calleeName(node.init);
    const [initial] = node.init.arguments;
    const idle =
      initial === undefined ||
      booleanOf(initial) === false ||
      (initial.type === 'Literal' && initial.value === null) ||
      initial.type === 'ObjectExpression';
    if (!idle) continue;
    if (
      hook === 'useState' &&
      node.id.type === 'ArrayPattern' &&
      node.id.elements[1]?.type === 'Identifier'
    ) {
      flags.set(node.id.elements[1].name, { kind: 'state', name: node.id.elements[1].name });
    } else if (hook === 'useRef' && node.id.type === 'Identifier' && booleanOf(initial) === false) {
      flags.set(node.id.name, { kind: 'ref', name: node.id.name });
    }
  }
  return flags;
}

/** Whether, after `on`, the function awaits something and then clears the same flag. */
function isReleased(owner: ESTree.Node, on: Write, flags: Map<string, Flag>): boolean {
  let awaited: number | undefined;
  for (const inner of descendants((owner as AnyFunction).body)) {
    if (inner.start <= on.node.start) continue;
    awaited ??= asyncPoint(inner);
    const off = writeOf(inner, flags);
    if (off && !off.busy && off.name === on.name && awaited !== undefined && inner.start > awaited)
      return true;
  }
  return false;
}

/** A data fetch started by an effect is a loading state, not a user action. */
function isEffectCallback(owner: AnyFunction): boolean {
  const call = owner.parent;
  return call?.type === 'CallExpression' && effects.has(calleeName(call) ?? '');
}

/**
 * A busy flag set by hand around an async action: `setX(true)` (or `ref.current = true`), then an
 * `await` or promise callback, then `setX(false)` — the shape `useAsyncAction` replaces.
 */
export default defineRule({
  meta: { type: 'problem' },
  create(context) {
    return {
      Program(program) {
        const flags = declaredFlags(program);
        if (flags.size === 0) return;
        for (const node of descendants(program)) {
          const on = writeOf(node, flags);
          const owner = on?.busy ? enclosingFunction(node) : undefined;
          if (!on || !owner || isEffectCallback(owner) || !isReleased(owner, on, flags)) continue;
          context.report({
            node,
            message:
              'Do not hand-roll a busy flag around an async action (set true, await, set false). Use useFormSubmit (@groam/ui/hooks/use-form-submit) for a form submit, or useAsyncAction (@groam/ui/hooks/use-async-action) for any other async button: both give isPending, a double-call guard, and error capture (see the build-form skill).'
          });
        }
      }
    };
  }
});
