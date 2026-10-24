import type { ESTree } from 'vite-plus/lint/plugins';

const contextHook = /^use[A-Z]\w*AgentContext$/u;

export type FunctionNode = ESTree.Function | ESTree.ArrowFunctionExpression;

export interface ImportBinding {
  imported: string;
  source: string;
}

/** A frame for a function being visited; `calls` are registering calls directly in its body. */
export interface FunctionFrame {
  name: string | undefined;
  node: FunctionNode;
  /** Declared at module top level under a name. */
  topLevel: boolean;
  exported: boolean;
  calls: ESTree.CallExpression[];
}

/** `useSetAgentContext` or a `use*AgentContext` hook; `useCurrentAgentContext` only reads. */
export function isContextHookName(name: string): boolean {
  return name !== 'useCurrentAgentContext' && contextHook.test(name);
}

/** Resolves the callee through its import, so `useSetAgentContext as useScreen` still counts. */
export function isRegisteringCall(
  node: ESTree.CallExpression,
  bindings: Map<string, ImportBinding>
): boolean {
  const { callee } = node;
  if (callee.type !== 'Identifier') return false;
  const name = bindings.get(callee.name)?.imported ?? callee.name;
  return name === 'useSetAgentContext' || isContextHookName(name);
}

/** A module top-level function with a PascalCase name. */
export const isComponentFrame = (frame: FunctionFrame | undefined) =>
  frame !== undefined && frame.topLevel && /^[A-Z]/u.test(frame.name ?? '');

export const isViewName = (name: string) => name.endsWith('View');

/** An import of a `*View` component from a `*-view` module. */
export const isViewBinding = (binding: ImportBinding | undefined) =>
  binding !== undefined && isViewName(binding.imported) && binding.source.endsWith('-view');

export function importBindings(program: ESTree.Program): Map<string, ImportBinding> {
  const bindings = new Map<string, ImportBinding>();
  for (const statement of program.body) {
    if (statement.type !== 'ImportDeclaration') continue;
    for (const specifier of statement.specifiers) {
      if (specifier.type !== 'ImportSpecifier' || specifier.imported.type !== 'Identifier')
        continue;
      bindings.set(specifier.local.name, {
        imported: specifier.imported.name,
        source: String(statement.source.value)
      });
    }
  }
  return bindings;
}

function declaredNames(declaration: ESTree.ExportNamedDeclaration['declaration']): string[] {
  if (declaration?.type === 'FunctionDeclaration' && declaration.id) return [declaration.id.name];
  if (declaration?.type !== 'VariableDeclaration') return [];
  return declaration.declarations.flatMap((item) =>
    item.id.type === 'Identifier' ? [item.id.name] : []
  );
}

/** Local names exported by `export function X`, `export const X`, and `export { X }`. */
export function exportedLocalNames(program: ESTree.Program): Set<string> {
  const names = new Set<string>();
  for (const statement of program.body) {
    if (statement.type !== 'ExportNamedDeclaration') continue;
    for (const name of declaredNames(statement.declaration)) names.add(name);
    if (statement.source) continue;
    for (const specifier of statement.specifiers) {
      if (specifier.local.type === 'Identifier') names.add(specifier.local.name);
    }
  }
  return names;
}

const isFunction = (node: unknown): node is FunctionNode =>
  typeof node === 'object' &&
  node !== null &&
  ['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'].includes(
    String(Reflect.get(node, 'type'))
  );

/** A top-level function declaration or `const name = function/arrow`, by name. */
export function topLevelFunction(program: ESTree.Program, name: string): FunctionNode | undefined {
  for (const raw of program.body) {
    const statement =
      raw.type === 'ExportNamedDeclaration' && raw.declaration ? raw.declaration : raw;
    if (statement.type === 'FunctionDeclaration' && statement.id?.name === name) return statement;
    if (statement.type !== 'VariableDeclaration') continue;
    for (const item of statement.declarations) {
      if (item.id.type === 'Identifier' && item.id.name === name && isFunction(item.init))
        return item.init;
    }
  }
  return undefined;
}

/** Every node below `root`, parents first. */
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
    for (const [key, value] of Object.entries(current)) {
      if (key !== 'parent') pending.push(value);
    }
  }
}

/**
 * Tracks the function stack and attributes each registering call to its innermost function.
 * Spread `visitors` into a rule's visitor object; `frames` fills as functions exit.
 */
export function trackFunctions(exported: () => Set<string>) {
  const stack: FunctionFrame[] = [];
  const frames: FunctionFrame[] = [];
  const declaredNames = new WeakMap<object, string>();
  const enter = (node: FunctionNode) => {
    const name = node.type === 'FunctionDeclaration' ? node.id?.name : declaredNames.get(node);
    stack.push({
      name,
      node,
      topLevel: stack.length === 0 && name !== undefined,
      exported: stack.length === 0 && name !== undefined && exported().has(name),
      calls: []
    });
  };
  const exit = () => {
    const frame = stack.pop();
    if (frame) frames.push(frame);
  };
  return {
    frames,
    /** The innermost function containing the node being visited, if any. */
    current: () => stack.at(-1),
    visitors: {
      VariableDeclarator(node: ESTree.VariableDeclarator) {
        if (node.id.type === 'Identifier' && isFunction(node.init))
          declaredNames.set(node.init, node.id.name);
      },
      FunctionDeclaration: enter,
      'FunctionDeclaration:exit': exit,
      FunctionExpression: enter,
      'FunctionExpression:exit': exit,
      ArrowFunctionExpression: enter,
      'ArrowFunctionExpression:exit': exit
    }
  };
}
