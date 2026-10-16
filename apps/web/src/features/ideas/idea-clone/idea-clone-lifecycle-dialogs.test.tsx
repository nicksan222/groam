import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { ProposalDetail } from '@/types/trips';
import { IdeaCloneLifecycleDialogs } from './idea-clone-lifecycle-dialogs';

const navigate = vi.hoisted(() => vi.fn());

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useNavigate: () => navigate
}));

vi.mock('@/features/trips/trip-versions/pass-on-idea', () => ({
  PassOnIdea: ({
    onClosed,
    onOpenChange,
    open
  }: {
    onClosed: () => void;
    onOpenChange: (open: boolean) => void;
    open: boolean;
  }) => (
    <div>
      <p>pass-on:{String(open)}</p>
      <button onClick={onClosed} type="button">
        finish-close
      </button>
      <button onClick={() => onOpenChange(false)} type="button">
        dismiss-pass-on
      </button>
    </div>
  )
}));

vi.mock('@/features/trips/trip-versions/apply-idea-dialog', () => ({
  ApplyIdeaDialog: ({
    onApply,
    onOpenChange,
    open,
    pending
  }: {
    onApply: () => Promise<boolean>;
    onOpenChange: (open: boolean) => void;
    open: boolean;
    pending: boolean;
  }) => (
    <div>
      <p>
        apply:{String(open)}:{String(pending)}
      </p>
      <button onClick={() => void onApply()} type="button">
        confirm-apply
      </button>
      <button onClick={() => onOpenChange(false)} type="button">
        dismiss-apply
      </button>
    </div>
  )
}));

const proposal = { id: 'idea-1' } as unknown as ProposalDetail;

function setup(
  overrides: Partial<Parameters<typeof IdeaCloneLifecycleDialogs>[0]> & {
    merge?: () => Promise<boolean>;
  } = {}
) {
  const run = vi.fn(async (_action: string, task: () => Promise<boolean>) => task());
  const setClosingOpen = vi.fn();
  const setConfirmingApply = vi.fn();
  const merge = overrides.merge ? vi.fn(overrides.merge) : vi.fn().mockResolvedValue(true);
  const { merge: _unused, ...rest } = overrides;
  const view = render(
    <IdeaCloneLifecycleDialogs
      closingOpen={false}
      confirmingApply={false}
      pendingAction={null}
      proposal={proposal}
      run={run as never}
      setClosingOpen={setClosingOpen}
      setConfirmingApply={setConfirmingApply}
      sharedTripId={'trip-1' as Id<'trips'>}
      version={{ close: vi.fn(), merge, proposal: { canClose: true } } as never}
      {...rest}
    />
  );
  return { merge, run, setClosingOpen, setConfirmingApply, view };
}

beforeEach(() => {
  navigate.mockReset();
});

describe('IdeaCloneLifecycleDialogs', () => {
  test.each<[string, boolean]>([
    ['open', true],
    ['closed', false]
  ])('passes the %s state to the pass-on dialog', async (_, open) => {
    await setup({ closingOpen: open }).view;
    await expect.element(page.getByText(`pass-on:${open}`)).toBeVisible();
  });

  test('hides the pass-on dialog when the viewer cannot close the idea', async () => {
    await setup({ version: { proposal: { canClose: false } } as never }).view;
    await expect.element(page.getByText('pass-on:', { exact: false })).not.toBeInTheDocument();
  });

  test('closing an idea returns to the shared trip board and forwards open changes', async () => {
    const { setClosingOpen, view } = setup();
    await view;
    await page.getByRole('button', { name: 'finish-close' }).click();
    expect(navigate).toHaveBeenCalledWith({
      params: { section: 'board', tripId: 'trip-1' },
      search: {},
      to: '/trips/$tripId/$section'
    });
    await page.getByRole('button', { name: 'dismiss-pass-on' }).click();
    expect(setClosingOpen).toHaveBeenCalledWith(false);
  });

  test('hides the apply dialog without a proposal', async () => {
    await setup({ proposal: null }).view;
    await expect.element(page.getByText('apply:', { exact: false })).not.toBeInTheDocument();
  });

  test('shows the apply dialog state and pending flag', async () => {
    await setup({ confirmingApply: true, pendingAction: 'merge' }).view;
    await expect.element(page.getByText('apply:true:true')).toBeVisible();
  });

  test('other pending actions do not mark apply as pending', async () => {
    await setup({ pendingAction: 'resolve' }).view;
    await expect.element(page.getByText('apply:false:false')).toBeVisible();
  });

  test('a successful apply runs a merge and opens the shared trip', async () => {
    const { merge, run, view } = setup();
    await view;
    await page.getByRole('button', { name: 'confirm-apply' }).click();
    await expect.poll(() => merge.mock.calls.length).toBe(1);
    expect(run.mock.calls[0]?.[0]).toBe('merge');
    expect(navigate).toHaveBeenCalledWith({
      params: { section: 'board', tripId: 'trip-1' },
      search: {},
      to: '/trips/$tripId/$section'
    });
  });

  test('a failed apply stays put', async () => {
    const { merge, view } = setup({ merge: vi.fn().mockResolvedValue(false) });
    await view;
    await page.getByRole('button', { name: 'confirm-apply' }).click();
    await expect.poll(() => merge.mock.calls.length).toBe(1);
    expect(navigate).not.toHaveBeenCalled();
  });

  test('dismissing the apply dialog updates the open state', async () => {
    const { setConfirmingApply, view } = setup();
    await view;
    await page.getByRole('button', { name: 'dismiss-apply' }).click();
    expect(setConfirmingApply).toHaveBeenCalledWith(false);
  });
});
