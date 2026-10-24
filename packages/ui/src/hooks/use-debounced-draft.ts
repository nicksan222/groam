import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * A text field's draft over a value committed more slowly: `draft` follows every keystroke, and
 * `onCommit` hears the latest one once typing pauses for `delay` ms. `flush` commits at once (Enter,
 * closing, a picked hint). A change to `value` from outside (a Clear button) replaces the draft and
 * drops any commit still waiting, so stale text never lands over it. The echo of the hook's own
 * commit, or an outside value equal to the draft, changes nothing, so typing on never snaps back.
 * That relies on the parent storing each commit verbatim as `value` (no trimming or normalising):
 * a `value` that differs from what was committed reads as an outside change and replaces the draft.
 */
export function useDebouncedDraft({
  delay = 200,
  onCommit,
  value
}: {
  delay?: number;
  onCommit: (next: string) => void;
  value: string;
}) {
  const [draft, setDraft] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const commit = useRef(onCommit);
  const latest = useRef(value);
  const committed = useRef(value);
  useEffect(() => {
    commit.current = onCommit;
  });

  const cancel = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = undefined;
  }, []);
  // oxlint-disable-next-line react-doctor/no-derived-state-effect -- The draft is local edits over `value`: only an outside change (Clear) may replace it, never the echo of its own commit, and it must also cancel the pending commit.
  useEffect(() => {
    const echo = value === committed.current || value === latest.current;
    committed.current = value;
    if (echo) return;
    cancel();
    latest.current = value;
    // oxlint-disable-next-line react-doctor/no-derived-state -- Replaces local edits only on an outside change; see the effect above.
    setDraft(value);
  }, [cancel, value]);
  useEffect(() => cancel, [cancel]);

  const change = useCallback(
    (next: string) => {
      latest.current = next;
      setDraft(next);
      cancel();
      timer.current = setTimeout(() => {
        timer.current = undefined;
        committed.current = next;
        commit.current(next);
      }, delay);
    },
    [cancel, delay]
  );
  const flush = useCallback(
    (next: string) => {
      cancel();
      latest.current = next;
      committed.current = next;
      setDraft(next);
      commit.current(next);
    },
    [cancel]
  );
  return { change, draft, flush };
}
