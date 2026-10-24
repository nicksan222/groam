import { defineRule } from 'vite-plus/lint/plugins';
import {
  exportedLocalNames,
  importBindings,
  isComponentFrame,
  isContextHookName,
  isRegisteringCall,
  isViewBinding,
  trackFunctions
} from './agent-context.ts';
import type { FunctionFrame, ImportBinding } from './agent-context.ts';

const nested =
  "Only the page view registers the assistant's screen context; nested registrations race and override each other. Pass the data to the *View, or wrap it in a use*AgentContext hook the view calls.";
const noop =
  'A use*AgentContext hook registers the screen context: it must call useSetAgentContext(…) once, directly in its body.';
const pageRoot =
  'Page views are page roots, rendered only by pages; extract the shared part into a component.';

const isContextHook = (frame: FunctionFrame) => isContextHookName(frame.name ?? '');

/** Registering calls belong to a top-level component of a *-view.tsx file, or to a context hook. */
export default defineRule({
  meta: { type: 'problem' },
  create(context) {
    const isViewFile = context.filename.endsWith('-view.tsx');
    // Pages render page views; they never register a context themselves.
    const isPage = context.filename.includes('/apps/web/pages/');
    let exported = new Set<string>();
    let bindings = new Map<string, ImportBinding>();
    const tracker = trackFunctions(() => exported);
    const mayRegister = (frame: FunctionFrame | undefined) =>
      frame !== undefined &&
      !isPage &&
      (isContextHook(frame) || (isViewFile && isComponentFrame(frame)));
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
        if (!mayRegister(frame)) context.report({ node, message: nested });
      },
      JSXOpeningElement(node) {
        if (
          !isPage &&
          node.name.type === 'JSXIdentifier' &&
          isViewBinding(bindings.get(node.name.name))
        )
          context.report({ node, message: pageRoot });
      },
      'Program:exit'() {
        for (const frame of tracker.frames) {
          if (isContextHook(frame) && frame.calls.length !== 1)
            context.report({ node: frame.node, message: noop });
        }
      }
    };
  }
});
