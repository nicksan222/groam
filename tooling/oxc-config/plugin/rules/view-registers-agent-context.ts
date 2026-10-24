import { defineRule } from 'vite-plus/lint/plugins';
import type { ESTree } from 'vite-plus/lint/plugins';
import type { ImportBinding } from './agent-context.ts';
import {
  exportedLocalNames,
  importBindings,
  isComponentFrame,
  isRegisteringCall,
  isViewName,
  trackFunctions
} from './agent-context.ts';

const missingView =
  'A *-view.tsx file is a page view: export its *View component, or rename the file.';
const zero =
  "A page view registers the assistant's screen context exactly once: call useSetAgentContext(…) or a use*AgentContext hook unconditionally in the view (or in a component of the same file). A screen with no AI actions still registers one, with `capabilities: []` and a description that says so.";
const many =
  'A page view registers one context per screen: call useSetAgentContext(…) or a use*AgentContext hook once in the file, and merge the data into that call.';

/** An exported *View, and exactly one registration in a top-level component of the file. */
export default defineRule({
  meta: { type: 'problem' },
  create(context) {
    let exported = new Set<string>();
    let bindings = new Map<string, ImportBinding>();
    const tracker = trackFunctions(() => exported);
    const calls: { node: ESTree.CallExpression; component: boolean }[] = [];
    return {
      Program(program) {
        exported = exportedLocalNames(program);
        bindings = importBindings(program);
      },
      ...tracker.visitors,
      CallExpression(node) {
        if (!isRegisteringCall(node, bindings)) return;
        const frame = tracker.current();
        frame?.calls.push(node);
        calls.push({ node, component: isComponentFrame(frame) });
      },
      'Program:exit'(program) {
        if (!tracker.frames.some((frame) => frame.exported && isViewName(frame.name ?? '')))
          context.report({ node: program, message: missingView });
        if (calls.length === 0) context.report({ node: program, message: zero });
        for (const [index, call] of calls.entries()) {
          if (index > 0) context.report({ node: call.node, message: many });
          else if (!call.component) context.report({ node: call.node, message: zero });
        }
      }
    };
  }
});
