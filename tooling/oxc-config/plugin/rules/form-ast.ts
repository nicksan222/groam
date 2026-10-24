import type { ESTree } from 'vite-plus/lint/plugins';

/**
 * Words the form guardrails treat as "an action is in flight", shared so the pending-state and
 * pending-copy rules cannot drift apart: a gerund ("saving", "applying"), or pending/busy/loading.
 */
const PENDING_NAME = /(?:[Pp]ending|[Bb]usy|[Ll]oading|[Ii]nFlight|[Pp]rogress|[a-z]ing(?![a-z]))/u;

/** A state or setter name that says an action is in flight: `isPending`, `setApplying`, `setPendingId`. */
export function isPendingName(name: string): boolean {
  return PENDING_NAME.test(name);
}

/** Words for fetching data to show, which are status text rather than a user's action. */
const DATA_LOADING = /[Ll]oading|[Ss]earching|[Ff]etching|[Ll]ooking/gu;

/**
 * Source text that mentions an action in flight, e.g. `pending`, `!saving`, `status === 'applying'`.
 * Data loading (`isLoading`, `searching`) is not an action.
 */
export function mentionsPending(text: string): boolean {
  return PENDING_NAME.test(text.replaceAll(DATA_LOADING, ''));
}

/** Every node below `root` in source order, including `root`. */
export function* descendants(root: unknown): Generator<ESTree.Node> {
  const pending: unknown[] = [root];
  while (pending.length > 0) {
    const current = pending.pop();
    if (typeof current !== 'object' || current === null) continue;
    if (Array.isArray(current)) {
      pending.push(...current.toReversed());
      continue;
    }
    if (typeof Reflect.get(current, 'type') === 'string') yield current as ESTree.Node;
    const entries = Object.entries(current).filter(([key]) => key !== 'parent');
    for (const [, value] of entries.toReversed()) pending.push(value);
  }
}

export type AnyFunction = ESTree.ArrowFunctionExpression | ESTree.Function;

export function isFunction(node: ESTree.Node | null | undefined): node is AnyFunction {
  return (
    node?.type === 'ArrowFunctionExpression' ||
    node?.type === 'FunctionDeclaration' ||
    node?.type === 'FunctionExpression'
  );
}

/** The nearest enclosing function of a node. */
export function enclosingFunction(node: ESTree.Node): AnyFunction | undefined {
  let current = node.parent as ESTree.Node | null | undefined;
  while (current && !isFunction(current)) current = current.parent as ESTree.Node | undefined;
  return current ?? undefined;
}

/** `useEffect` / `foo.useEffect` style callee name of a call, if it has one. */
export function calleeName(node: ESTree.CallExpression): string | undefined {
  const { callee } = node;
  if (callee.type === 'Identifier') return callee.name;
  if (
    callee.type === 'MemberExpression' &&
    !callee.computed &&
    callee.property.type === 'Identifier'
  )
    return callee.property.name;
  return undefined;
}

/** Name of a JSX element, `Dialog.Content` as `Dialog.Content`. */
export function jsxName(name: ESTree.JSXOpeningElement['name']): string {
  if (name.type === 'JSXIdentifier') return name.name;
  if (name.type === 'JSXMemberExpression') return `${jsxName(name.object)}.${name.property.name}`;
  return `${name.namespace.name}:${name.name.name}`;
}
