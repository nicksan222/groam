import { useEffect, useState } from 'react';
import { MAX_PACKING_QUANTITY } from './packing-coverage';

const SEP = '\u0000';

/**
 * Keys that appeared after the first render (or after `ready`), so only newly added things
 * animate in and a page load never does. Derived during render, no effect.
 */
export function useArrivals(keys: readonly string[], ready = true): ReadonlySet<string> {
  const signature = keys.join(SEP);
  const [state, setState] = useState<{ arrived: ReadonlySet<string>; signature: string | null }>({
    arrived: new Set(),
    signature: ready ? signature : null
  });
  if (!ready) {
    if (state.signature !== null) setState({ arrived: new Set(), signature: null });
    return state.arrived;
  }
  if (state.signature === null) {
    setState({ arrived: new Set(), signature });
  } else if (state.signature !== signature) {
    const known = new Set(state.signature ? state.signature.split(SEP) : []);
    setState({ arrived: new Set(keys.filter((key) => !known.has(key))), signature });
  }
  return state.arrived;
}

/** True once `value` has changed since mount; stays true so the state's own animation can run. */
export function useChanged<T>(value: T): boolean {
  const [state, setState] = useState({ changed: false, value });
  if (!Object.is(state.value, value)) setState({ changed: true, value });
  return state.changed;
}

/** Counts upward each time `count` rises, so a one-shot highlight can restart by key. */
export function useRisePulse(count: number): number {
  const [state, setState] = useState({ count, pulse: 0 });
  if (state.count !== count) {
    setState({ count, pulse: count > state.count ? state.pulse + 1 : state.pulse });
  }
  return state.pulse;
}

/**
 * `items` plus the ones that just left, kept in place for `ms` so a removal can animate out.
 * Each entry says whether it is leaving; leaving entries are decorative and should be inert.
 */
export function useDeparting<T>(
  items: readonly T[],
  keyOf: (item: T) => string,
  ms = 150
): readonly { item: T; leaving: boolean }[] {
  const signature = items.map(keyOf).join(SEP);
  const [state, setState] = useState<{
    leaving: ReadonlyMap<string, { index: number; item: T }>;
    previous: readonly T[];
    signature: string;
  }>({ leaving: new Map(), previous: items, signature });
  if (state.signature !== signature) {
    const current = new Set(items.map(keyOf));
    const leaving = new Map(state.leaving);
    for (const key of current) leaving.delete(key);
    state.previous.forEach((item, index) => {
      const key = keyOf(item);
      if (!current.has(key)) leaving.set(key, { index, item });
    });
    setState({ leaving, previous: items, signature });
  }
  const { leaving } = state;
  useEffect(() => {
    if (leaving.size === 0) return;
    const timer = setTimeout(() => setState((s) => ({ ...s, leaving: new Map() })), ms);
    return () => clearTimeout(timer);
  }, [leaving, ms]);
  const rendered = items.map((item) => ({ item, leaving: false }));
  for (const { index, item } of [...leaving.values()].toSorted((a, b) => a.index - b.index)) {
    rendered.splice(Math.min(index, rendered.length), 0, { item, leaving: true });
  }
  return rendered;
}

/**
 * Runs one write at a time and reports when one is in flight, so a double click or a held
 * Enter sends a single request. Calls made while busy are dropped.
 */
export function usePendingWrite() {
  const [pending, setPending] = useState(false);
  const [lock] = useState({ busy: false });
  const run = async <T>(write: () => Promise<T> | T): Promise<T | undefined> => {
    if (lock.busy) return undefined;
    lock.busy = true;
    setPending(true);
    try {
      return await write();
    } finally {
      lock.busy = false;
      setPending(false);
    }
  };
  return { pending, run };
}

function claimChange(
  previous: string,
  items: readonly { id: string; label: string }[],
  counts: ReadonlyMap<string, number>
): string {
  const known = new Map(
    previous
      .split(SEP)
      .filter(Boolean)
      .map((entry) => entry.split('=') as [string, string])
  );
  let message = '';
  for (const item of items) {
    const before = known.get(item.id);
    const now = counts.get(item.id) ?? 0;
    if (before === undefined || Number(before) === now) continue;
    message =
      now === 0
        ? `You’re no longer bringing ${item.label}`
        : `You’re bringing ${now} of ${item.label}`;
  }
  return message;
}

/**
 * The one polite announcement for a gear section: what changed in the viewer's own share of an
 * item ("You're bringing 2 of Tent"). Quiet on load and for everyone else's changes.
 */
export function useViewerClaimAnnouncement(
  items: readonly {
    bringers: readonly { count: number; userId: string }[];
    id: string;
    label: string;
  }[],
  viewerUserId: string | undefined,
  ready: boolean
): string {
  const counts = new Map(
    items.map((item) => [
      item.id,
      item.bringers.find((bringer) => bringer.userId === viewerUserId)?.count ?? 0
    ])
  );
  const signature = items.map((item) => `${item.id}=${counts.get(item.id)}`).join(SEP);
  const [state, setState] = useState<{ message: string; signature: string | null }>({
    message: '',
    signature: ready ? signature : null
  });
  if (!ready) {
    if (state.signature !== null) setState({ message: '', signature: null });
    return state.message;
  }
  if (state.signature === null) {
    setState({ message: '', signature });
  } else if (state.signature !== signature) {
    const message = claimChange(state.signature, items, counts);
    setState({ message, signature });
  }
  return state.message;
}

/**
 * Sends changes to who brings an item without ever dropping a tap. Each tap is a step from the
 * count the person last asked for, so rapid taps add up; while one write is in flight the rest
 * collapse into the latest wanted count, sent once it lands.
 */
export function useCoalescedBring(
  send: (userId: string, count: number, previousCount: number) => Promise<unknown> | unknown,
  currentCount: (userId: string) => number
) {
  const [lock] = useState(() => ({
    inflight: new Set<string>(),
    wanted: new Map<string, number>()
  }));
  return (userId: string, step: number) => {
    const saved = currentCount(userId);
    const target = Math.min(
      MAX_PACKING_QUANTITY,
      Math.max(0, (lock.wanted.get(userId) ?? saved) + step)
    );
    lock.wanted.set(userId, target);
    if (lock.inflight.has(userId)) return;
    lock.inflight.add(userId);
    void (async () => {
      let sent = saved;
      try {
        while (lock.wanted.get(userId) !== sent) {
          const next = lock.wanted.get(userId) ?? sent;
          await send(userId, next, currentCount(userId));
          sent = next;
        }
      } finally {
        lock.inflight.delete(userId);
        lock.wanted.delete(userId);
      }
    })();
  };
}
