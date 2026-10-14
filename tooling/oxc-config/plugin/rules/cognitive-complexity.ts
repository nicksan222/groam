import { defineRule } from 'vite-plus/lint/plugins';
import type { Context, ESTree } from 'vite-plus/lint/plugins';

// Port of Biome complexity/noExcessiveCognitiveComplexity, which scores each function with the
// Sonar Cognitive Complexity algorithm. The walk mirrors Biome's visitor so scores stay identical:
// https://github.com/biomejs/biome/blob/main/crates/biome_js_analyze/src/lint/complexity/no_excessive_cognitive_complexity.rs

type Node = ESTree.Node;
type FunctionState = { lastOperator: string | undefined; nesting: number; score: number };
type Walk = { context: Context; max: number; stack: FunctionState[] };

const LOOPS = new Set([
  'DoWhileStatement',
  'ForInStatement',
  'ForOfStatement',
  'ForStatement',
  'WhileStatement'
]);
const NESTING = new Set([
  ...LOOPS,
  'CatchClause',
  'ConditionalExpression',
  'IfStatement',
  'SwitchStatement'
]);

function isNode(value: unknown): value is Node {
  return (
    typeof value === 'object' && value !== null && typeof Reflect.get(value, 'type') === 'string'
  );
}

function children(node: Node): Node[] {
  const found: Node[] = [];
  for (const [key, value] of Object.entries(node)) {
    if (key === 'parent') continue;
    for (const item of Array.isArray(value) ? value : [value]) {
      if (isNode(item)) found.push(item);
    }
  }
  return found.sort((left, right) => left.start - right.start);
}

function isFunctionLike(node: Node, parent: Node | undefined): boolean {
  if (node.type === 'ArrowFunctionExpression' || node.type === 'FunctionDeclaration') return true;
  if (node.type !== 'FunctionExpression') return false;
  // Biome scores methods and constructors, but getters and setters count toward their parent.
  const kind = parent && 'kind' in parent ? parent.kind : undefined;
  return kind !== 'get' && kind !== 'set';
}

function receivesStructuralPenalty(node: Node, parent: Node | undefined): boolean {
  if (NESTING.has(node.type)) return true;
  if ((node.type === 'BreakStatement' || node.type === 'ContinueStatement') && node.label) {
    return true;
  }
  // Biome has a dedicated finally clause node; ESTree exposes it as the try finalizer block.
  return parent?.type === 'TryStatement' && parent.finalizer === node;
}

function score(state: FunctionState, node: Node, parent: Node | undefined) {
  if (receivesStructuralPenalty(node, parent)) {
    state.score += 1 + (NESTING.has(node.type) ? state.nesting : 0);
  }
  if (NESTING.has(node.type)) {
    state.lastOperator = undefined;
    state.nesting += 1;
  } else if (node.type === 'LogicalExpression') {
    if (state.lastOperator !== node.operator) state.score += 1;
    state.lastOperator = node.operator;
  } else {
    state.lastOperator = undefined;
  }
}

function enter(walk: Walk, node: Node, parent: Node | undefined) {
  const outer = walk.stack.at(-1);
  if (isFunctionLike(node, parent)) {
    walk.stack.push({ lastOperator: undefined, nesting: outer ? outer.nesting + 1 : 0, score: 0 });
  }
  const state = walk.stack.at(-1);
  if (state) score(state, node, parent);
}

function leave(walk: Walk, node: Node, parent: Node | undefined) {
  if (!isFunctionLike(node, parent)) {
    const state = walk.stack.at(-1);
    if (state && NESTING.has(node.type)) state.nesting = Math.max(0, state.nesting - 1);
    return;
  }
  const state = walk.stack.pop();
  if (state && state.score > walk.max) {
    walk.context.report({
      node,
      message: `Excessive complexity of ${state.score} detected (max: ${walk.max}). Extract helpers or simplify the control flow.`
    });
  }
}

// Biome wraps an `if` alternate in an else clause node with its own enter/leave effects.
function enterElse(walk: Walk, alternate: Node) {
  const state = walk.stack.at(-1);
  if (!state) return;
  if (alternate.type === 'IfStatement') state.nesting = Math.max(0, state.nesting - 1);
  else state.score += 1;
}

function leaveElse(walk: Walk, alternate: Node) {
  const state = walk.stack.at(-1);
  if (!state) return;
  state.nesting =
    alternate.type === 'IfStatement' ? state.nesting + 1 : Math.max(0, state.nesting - 1);
}

function visit(walk: Walk, node: Node, parent: Node | undefined) {
  enter(walk, node, parent);
  for (const child of children(node)) {
    const isElse = node.type === 'IfStatement' && node.alternate === child;
    if (isElse) enterElse(walk, child);
    visit(walk, child, node);
    if (isElse) leaveElse(walk, child);
  }
  leave(walk, node, parent);
}

function maxAllowed(options: unknown): number {
  const value: unknown =
    typeof options === 'object' && options !== null
      ? Reflect.get(options, 'maxAllowedComplexity')
      : undefined;
  return typeof value === 'number' ? value : 15;
}

export default defineRule({
  meta: {
    type: 'suggestion',
    schema: [
      {
        type: 'object',
        properties: { maxAllowedComplexity: { type: 'integer', minimum: 1 } },
        additionalProperties: false
      }
    ]
  },
  create(context) {
    return {
      Program(program) {
        visit({ context, max: maxAllowed(context.options[0]), stack: [] }, program, undefined);
      }
    };
  }
});
