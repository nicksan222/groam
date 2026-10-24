import { describe, expect, test } from 'vite-plus/test';
import { lintFixture } from './fixture.ts';

function lint(
  rule: string,
  source: string,
  file = 'apps/web/src/features/example/example-view.tsx'
) {
  return lintFixture(source, file, `groam(${rule})`);
}

/** The sources the rule should have reported but did not. */
function missed(rule: string, sources: string[], file?: string) {
  return sources.filter((source) => lint(rule, source, file).status !== 1);
}

/** The sources the rule reported though they are fine. */
function falseAlarms(rule: string, sources: string[], file?: string) {
  return sources.filter((source) => lint(rule, source, file).status !== 0);
}

const DIALOG = `import { Dialog, DialogContent } from '@groam/ui/components/dialog';
import { Form } from '@groam/ui/components/form';\n`;

describe('groam/no-form-in-raw-dialog', () => {
  const rule = 'no-form-in-raw-dialog';

  test('reports a Form rendered inside a Dialog', () => {
    const result = lint(
      rule,
      `${DIALOG}export const view = <Dialog open><DialogContent><Form onSubmit={() => {}} /></DialogContent></Dialog>;`
    );
    expect(result.status).toBe(1);
    expect(result.output).toContain('Use FormDialog');
  });

  test('resolves aliases, member expressions, and AlertDialog', () => {
    expect(
      missed(rule, [
        `import { Dialog as Modal, DialogContent as Body } from '@groam/ui/components/dialog';
import { Form as Fields } from '@groam/ui/components/form';
export const view = <Modal open><Body><Fields onSubmit={() => {}} /></Body></Modal>;`,
        `import * as Dialog from '@groam/ui/components/dialog';
import { Form } from '@groam/ui/components/form';
export const view = <Dialog.Root open><Dialog.Content><Form onSubmit={() => {}} /></Dialog.Content></Dialog.Root>;`,
        `import { AlertDialog, AlertDialogContent } from '@groam/ui/components/alert-dialog';
import { Form } from '@groam/ui/components/form';
export const view = <AlertDialog open><AlertDialogContent><div><Form onSubmit={() => {}} /></div></AlertDialogContent></AlertDialog>;`
      ])
    ).toEqual([]);
  });

  test('allows FormDialog, a plain Form, a Form in a Sheet, and a sibling Form', () => {
    expect(
      falseAlarms(rule, [
        `export const view = <FormDialog open onClose={() => {}} onSubmit={() => {}}><input /></FormDialog>;`,
        `import { Form } from '@groam/ui/components/form';
export const view = <Form onSubmit={() => {}} />;`,
        `import { Sheet, SheetContent } from '@groam/ui/components/sheet';
import { Form } from '@groam/ui/components/form';
export const view = <Sheet open><SheetContent><Form onSubmit={() => {}} /></SheetContent></Sheet>;`,
        `${DIALOG}export const view = <Dialog open><DialogContent>Details</DialogContent></Dialog>;`,
        `${DIALOG}export const view = <><Form onSubmit={() => {}} /><Dialog open><DialogContent>Details</DialogContent></Dialog></>;`
      ])
    ).toEqual([]);
  });

  test('ignores tests', () => {
    expect(
      lint(
        rule,
        `${DIALOG}export const view = <Dialog open><Form /></Dialog>;`,
        'apps/web/src/features/example/example-view.test.tsx'
      ).status
    ).toBe(0);
  });
});

describe('groam/no-manual-draft-reset', () => {
  const rule = 'no-manual-draft-reset';
  const file = 'apps/web/src/features/example/use-draft.ts';
  const wrap = (body: string) =>
    `import { useEffect } from 'react';\nexport function useDraft(open: boolean) {\n  ${body}\n}`;

  test('reports an effect keyed on open that resets state', () => {
    const result = lint(rule, wrap(`useEffect(() => { if (open) setName(''); }, [open]);`), file);
    expect(result.status).toBe(1);
    expect(result.output).toContain('useOpenSession');
    expect(
      missed(
        rule,
        [
          `useEffect(() => { if (isOpen) setName(''); }, [isOpen]);`,
          `useEffect(() => { setName(''); }, [props.open]);`,
          `useEffect(() => { if (dialogOpen) { setName(''); } }, [dialogOpen]);`,
          `useEffect(() => { setName(''); }, [isDialogOpen]);`,
          `useEffect(() => { setName(''); }, [state.isOpen]);`,
          `useEffect(() => { if (open) form.reset(); }, [open]);`,
          `useEffect(() => { if (open) reset(); }, [open]);`,
          `useEffect(() => { if (open) dispatch({ type: 'reset' }); }, [open]);`,
          `useEffect(() => setName(''), [open]);`
        ].map(wrap),
        file
      )
    ).toEqual([]);
  });

  test('allows effects that do not reset state or are not keyed on open', () => {
    expect(
      falseAlarms(
        rule,
        [
          `useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);`,
          `useEffect(() => { setName(value); }, [value]);`,
          `useEffect(() => { setName(''); });`,
          `useEffect(() => { const timer = setTimeout(() => {}, 10); return () => clearTimeout(timer); }, [open]);`,
          `useEffect(() => { const id = setInterval(tick, 10); return () => clearInterval(id); }, [open]);`,
          `useEffect(() => { if (open) void load().then((rows) => setRows(rows)); }, [open]);`,
          `useEffect(() => { if (open) dispatch({ type: 'focus' }); }, [open]);`,
          `useEffect(() => { setName(''); }, [reopen]);`
        ].map(wrap),
        file
      )
    ).toEqual([]);
  });
});

describe('groam/no-hand-rolled-pending', () => {
  const rule = 'no-hand-rolled-pending';
  const file = 'apps/web/src/features/example/use-example.ts';
  const hook = (declaration: string, body: string) =>
    `import { useRef, useState } from 'react';\nexport function useExample() {\n  ${declaration}\n  const act = async () => {\n    ${body}\n  };\n  return act;\n}`;

  test('reports a busy flag set around an await, whatever it is called', () => {
    const result = lint(
      rule,
      hook(
        'const [pending, setPending] = useState(false);',
        'setPending(true);\n    await save();\n    setPending(false);'
      ),
      file
    );
    expect(result.status).toBe(1);
    expect(result.output).toContain('useAsyncAction');
    expect(
      missed(
        rule,
        [
          hook(
            'const [loading, setLoading] = useState(false);',
            'setLoading(true);\n    try { await save(); } finally { setLoading(false); }'
          ),
          hook(
            'const [applying, setApplying] = useState<boolean>(false);',
            'setApplying(true);\n    await save();\n    setApplying(false);'
          ),
          hook(
            'const [joining, setJoining] = React.useState(false);',
            'setJoining(true);\n    await save();\n    setJoining(false);'
          ),
          hook(
            'const busy = useRef(false);',
            'busy.current = true;\n    try { await save(); } finally { busy.current = false; }'
          ),
          hook(
            'const [state, setState] = useState({ busy: false });',
            'setState({ busy: true });\n    await save();\n    setState({ busy: false });'
          ),
          hook(
            'const [pendingId, setPendingId] = useState<string | null>(null);',
            "setPendingId('a');\n    await save();\n    setPendingId(null);"
          ),
          hook(
            'const [claiming, setClaiming] = useState(false);',
            'setClaiming(true);\n    void save().finally(() => setClaiming(false));'
          )
        ],
        file
      )
    ).toEqual([]);
  });

  test('allows toggles that are not released after an async step', () => {
    expect(
      falseAlarms(
        rule,
        [
          hook('const [open, setOpen] = useState(false);', 'setOpen(true);'),
          hook('const [done, setDone] = useState(false);', 'await save();\n    setDone(true);'),
          hook(
            'const [open, setOpen] = useState(false);',
            'setOpen(true);\n    await save();\n    setOpen(true);'
          ),
          hook(
            'const [open, setOpen] = useState(false);',
            'setOpen(false);\n    await save();\n    setOpen(true);'
          ),
          // Not declared with useState in this file (a prop setter): out of scope.
          `export function useExample(setBusy: (value: boolean) => void) {\n  return async () => {\n    setBusy(true);\n    await save();\n    setBusy(false);\n  };\n}`,
          // A data fetch started by an effect is a loading state, not an action.
          `import { useEffect, useState } from 'react';\nexport function useRows() {\n  const [loading, setLoading] = useState(false);\n  useEffect(() => {\n    setLoading(true);\n    void load().finally(() => setLoading(false));\n  }, []);\n  return loading;\n}`
        ],
        file
      )
    ).toEqual([]);
  });
});

describe('groam/no-pending-copy', () => {
  const rule = 'no-pending-copy';

  test('reports pending copy in a button or a pending conditional, anywhere it lands', () => {
    expect(
      missed(rule, [
        `export const view = <Button type="submit">Saving…</Button>;`,
        `export const view = (pending: boolean) => <Button>{pending ? 'Sending...' : 'Send'}</Button>;`,
        `export const view = (pending: boolean) => <p>{pending ? 'Applying…' : 'Apply choices'}</p>;`,
        `export const view = (pending: boolean) => <AlertDialogAction>{pending ? 'Applying…' : 'Apply'}</AlertDialogAction>;`,
        `export const view = (pending: boolean) => { const label = pending ? 'Saving…' : 'Save'; return label; };`,
        `export const view = (isSaving: boolean) => <FormActions submitLabel={isSaving ? 'Saving…' : 'Save'} />;`,
        `export const view = (status: string) => <Button>{status === 'applying' ? 'Adding to trip…' : 'Add'}</Button>;`
      ])
    ).toEqual([]);
  });

  test('allows spinners, status text, and unrelated conditionals', () => {
    expect(
      falseAlarms(rule, [
        `export const view = (pending: boolean) => <Button pending={pending}>Send</Button>;`,
        `export const view = <span role="status">Sending…</span>;`,
        `export const view = (name: string) => <p>{name} · Uploading…</p>;`,
        `export const view = (ai: boolean) => <p>{ai ? 'Writing…' : 'Saving note…'}</p>;`,
        `export const view = <Button>Continue…</Button>;`
      ])
    ).toEqual([]);
  });
});

describe('groam/no-optional-copy', () => {
  const rule = 'no-optional-copy';

  test('reports optional marks in text, copy attributes, and JSX string children', () => {
    expect(
      missed(rule, [
        `export const view = <label>Notes (optional)</label>;`,
        `export const view = <input placeholder="Notes (optional)" />;`,
        `export const view = <span>Optional</span>;`,
        `export const view = <span>Optional: add a note</span>;`,
        `export const view = <FormField label="Optional note"><input /></FormField>;`,
        `export const view = <input placeholder={'Notes [optional]'} />;`,
        `export const view = <p>{'Optional'}</p>;`
      ])
    ).toEqual([]);
  });

  test('allows the optional prop, prose, and type-level strings', () => {
    expect(
      falseAlarms(rule, [
        `export const view = <FormField label="Notes" optional><input /></FormField>;`,
        `export const view = <p>Add an optional note for the group.</p>;`,
        `type Requirement = 'optional' | 'required';\nexport const level: Requirement = 'optional';`,
        `export const options = { mode: 'optional' };`,
        `export const view = <input data-mode="optional" />;`
      ])
    ).toEqual([]);
  });
});

describe('groam/no-spinner-in-button', () => {
  const rule = 'no-spinner-in-button';

  test('reports a Spinner inside a Button, directly or conditionally', () => {
    expect(
      missed(rule, [
        `export const view = <Button><Spinner />Save</Button>;`,
        `export const view = (pending: boolean) => <Button>{pending ? <Spinner /> : <Plus />}Add</Button>;`,
        `export const view = (more: boolean) => <Button>{more && <Spinner aria-hidden />} Load more</Button>;`
      ])
    ).toEqual([]);
  });

  test('allows pending, and a Spinner outside a Button', () => {
    expect(
      falseAlarms(rule, [
        `export const view = (pending: boolean) => <Button pending={pending}>Save</Button>;`,
        `export const view = <div><Spinner />Loading trips</div>;`
      ])
    ).toEqual([]);
  });
});
