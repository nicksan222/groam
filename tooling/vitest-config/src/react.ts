import {
  act as reactAct,
  type ComponentType,
  createElement,
  Fragment,
  type PropsWithChildren,
  type ReactNode
} from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach } from 'vite-plus/test';

declare global {
  // React reads this to decide whether to warn about updates outside act().
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

type Mount = { container: HTMLElement; root: Root };

const mounted = new Set<Mount>();

/**
 * Runs `work` inside React's act() and waits for the updates it schedules. Only renders, unmounts,
 * and direct hook calls need it. Outside act the flag is off, so real clicks and typing don't
 * trigger React's act() warning (which the console guard would fail).
 */
export async function act<Result>(work: () => Result | Promise<Result>): Promise<Result> {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  try {
    let result!: Result;
    await reactAct(async () => {
      result = await work();
    });
    return result;
  } finally {
    globalThis.IS_REACT_ACT_ENVIRONMENT = false;
  }
}

async function unmount(mount: Mount): Promise<void> {
  mounted.delete(mount);
  await act(() => mount.root.unmount());
  mount.container.remove();
}

afterEach(async () => {
  // oxlint-disable-next-line react-doctor/async-await-in-loop -- React rejects overlapping act() scopes.
  for (const mount of mounted) await unmount(mount);
});

// act() rethrows render errors; drop the broken root so the next render starts clean.
async function commit(mount: Mount, ui: ReactNode): Promise<void> {
  try {
    await act(() => mount.root.render(ui));
  } catch (error) {
    mounted.delete(mount);
    mount.container.remove();
    throw error;
  }
}

export type RenderResult = Awaited<ReturnType<typeof render>>;

/**
 * Mounts `ui` into the page for a browser-mode test; it unmounts after the test. Rejects when a
 * component throws while rendering.
 */
export async function render(ui: ReactNode) {
  const container = document.body.appendChild(document.createElement('div'));
  const mount = { container, root: createRoot(container) };
  mounted.add(mount);
  await commit(mount, ui);
  return {
    container,
    rerender: (next: ReactNode) => commit(mount, next),
    unmount: () => unmount(mount)
  };
}

/** Renders `hook` inside a component and exposes its latest result. */
export async function renderHook<Result, Props = undefined>(
  hook: (props: Props) => Result,
  options: { initialProps?: Props; wrapper?: ComponentType<PropsWithChildren> } = {}
) {
  const result = { current: undefined as Result };
  const Wrapper = options.wrapper ?? Fragment;
  function Probe({ props }: { props: Props }) {
    result.current = hook(props);
    return null;
  }
  const tree = (props: Props) => createElement(Wrapper, null, createElement(Probe, { props }));
  const view = await render(tree(options.initialProps as Props));
  return {
    rerender: (props?: Props) => view.rerender(tree(props as Props)),
    result,
    unmount: view.unmount
  };
}
