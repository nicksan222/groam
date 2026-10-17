import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { cdp, page, userEvent } from 'vite-plus/test/browser';
import { GroupGearItemEditor } from './group-gear-item-editor';
import { GroupGearList } from './group-gear-list';
import { GroupGearPersonPicker } from './group-gear-person-picker';
import { GroupGearSkeleton } from './group-gear-skeleton';
import { PackingErrorBoundary } from './packing-error-boundary';

const item = (overrides: Record<string, unknown> = {}) =>
  ({
    bringers: [
      { count: 1, image: null, name: 'Ana', userId: 'ana' },
      { count: 99, image: null, name: 'Bo', userId: 'bo' }
    ],
    brought: 100,
    id: 'item-1',
    label: 'Tent',
    quantity: 99,
    ...overrides
  }) as never;

const noop = () => undefined;

describe('packing hardening', () => {
  test('the traveler picker only offers search past eight people and filters by name', async () => {
    const few = Array.from({ length: 8 }, (_, i) => ({ name: `Person ${i}`, userId: `u${i}` }));
    const many = [...few, { name: 'Zed Zimmer', userId: 'zed' }];
    const { rerender } = await render(
      <GroupGearPersonPicker itemLabel="Tent" onPick={noop} travelers={few} />
    );
    await page.getByRole('button', { name: 'Add a person to bring Tent' }).click();
    await expect.element(page.getByLabelText('Search travelers')).not.toBeInTheDocument();
    await page.getByRole('button', { name: 'Add a person to bring Tent' }).click();

    const onPick = vi.fn();
    await rerender(<GroupGearPersonPicker itemLabel="Tent" onPick={onPick} travelers={many} />);
    await page.getByRole('button', { name: 'Add a person to bring Tent' }).click();
    await page.getByLabelText('Search travelers').fill('zim');
    await expect.element(page.getByRole('button', { name: 'Person 1' })).not.toBeInTheDocument();
    await page.getByRole('button', { name: 'Zed Zimmer' }).click();
    expect(onPick).toHaveBeenCalledWith('zed');
  });

  test('the picker says so when nobody matches', async () => {
    const many = Array.from({ length: 9 }, (_, i) => ({ name: `Person ${i}`, userId: `u${i}` }));
    await render(<GroupGearPersonPicker itemLabel="Tent" onPick={noop} travelers={many} />);
    await page.getByRole('button', { name: 'Add a person to bring Tent' }).click();
    await page.getByLabelText('Search travelers').fill('qqq');
    await expect.element(page.getByText(/No traveler matches/u)).toBeVisible();
  });

  test("a double click on I'll bring one sends one write and shows it is busy", async () => {
    let finish: () => void = noop;
    const onBring = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        })
    );
    await render(
      <GroupGearItemEditor
        item={item({ bringers: [], brought: 0 })}
        onBring={onBring}
        onRemove={noop}
        onUpdate={noop}
        travelers={[]}
        viewerUserId="me"
      />
    );
    const claim = page.getByRole('button', { name: "I'll bring one Tent" });
    await claim.dblClick();
    expect(onBring).toHaveBeenCalledTimes(1);
    await expect.element(claim).toBeDisabled();
    finish();
    await expect.element(claim).toBeEnabled();
  });

  test('name and need stay real labelled inputs; Enter commits and Escape reverts', async () => {
    const onUpdate = vi.fn();
    await render(
      <GroupGearItemEditor
        item={item({ bringers: [], brought: 0 })}
        onBring={noop}
        onRemove={noop}
        onUpdate={onUpdate}
        travelers={[]}
        viewerUserId={undefined}
      />
    );
    const name = page.getByLabelText('Name of Tent');
    await name.fill('Big tent');
    await name
      .element()
      .dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
    expect(onUpdate).toHaveBeenCalledWith('item-1', { label: 'Big tent' });
    await name.fill('Nope');
    await name
      .element()
      .dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }));
    await expect.element(name).toHaveValue('Tent');
  });

  test('a removed bringer chip leaves in place before it is gone', async () => {
    const { rerender } = await render(
      <GroupGearItemEditor
        item={item()}
        onBring={noop}
        onRemove={noop}
        onUpdate={noop}
        travelers={[]}
        viewerUserId="me"
      />
    );
    await expect.element(page.getByRole('group', { name: 'Ana, 1 of this item' })).toBeVisible();
    await rerender(
      <GroupGearItemEditor
        item={item({ bringers: [{ count: 99, image: null, name: 'Bo', userId: 'bo' }] })}
        onBring={noop}
        onRemove={noop}
        onUpdate={noop}
        travelers={[]}
        viewerUserId="me"
      />
    );
    expect(document.querySelector('[data-leaving="true"]')).not.toBeNull();
    await vi.waitFor(() => expect(document.querySelector('[data-leaving="true"]')).toBeNull());
    await expect.element(page.getByRole('group', { name: 'Bo, 99 of this item' })).toBeVisible();
  });

  test('the loading skeleton is one busy, named list', async () => {
    await render(<GroupGearSkeleton />);
    await expect
      .element(page.getByLabelText('Loading group gear…'))
      .toHaveAttribute('aria-busy', 'true');
  });

  test('a failed card shows an error with a way to retry, and recovers', async () => {
    let fail = true;
    function Probe() {
      if (fail) throw new Error('offline');
      return <p>Loaded</p>;
    }
    vi.spyOn(console, 'error').mockImplementation(noop);
    await render(
      <PackingErrorBoundary what="the group gear">
        <Probe />
      </PackingErrorBoundary>
    );
    await expect.element(page.getByText("We couldn't load the group gear.")).toBeVisible();
    fail = false;
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect.element(page.getByText('Loaded')).toBeVisible();
  });

  test('a 200-item list renders every row, deferring off-screen layout to the browser', async () => {
    const items = Array.from({ length: 200 }, (_, i) =>
      item({ bringers: [], brought: 0, id: `item-${i}`, label: `Gear ${i}`, quantity: 3 })
    );
    const packing = {
      add: noop,
      bring: noop,
      isLoading: false,
      items,
      remove: noop,
      update: noop
    } as never;
    const { container } = await render(
      <GroupGearList
        editable={false}
        packing={packing}
        proposal={false}
        travelers={[]}
        viewerUserId="me"
      />
    );
    expect(container.querySelectorAll('li')).toHaveLength(200);
    expect(getComputedStyle(container.querySelector('li')!).contentVisibility).toBe('auto');
  });

  test('with reduced motion the packing animations do not run', async () => {
    const session = cdp();
    const setMotion = (value: 'no-preference' | 'reduce') =>
      session.send('Emulation.setEmulatedMedia', {
        features: [{ name: 'prefers-reduced-motion', value }]
      });
    await setMotion('reduce');
    try {
      const { container } = await render(
        <div>
          <span className="packing-pop-in" data-testid="in" />
          <span className="packing-pop-out" data-testid="out" />
          <span className="packing-row-flash" data-testid="flash" />
        </div>
      );
      const style = (id: string) =>
        getComputedStyle(container.querySelector(`[data-testid="${id}"]`)!);
      expect(style('in').animationName).toBe('none');
      expect(style('out').animationName).toBe('none');
      expect(style('flash').display).toBe('none');
      await setMotion('no-preference');
      expect(style('in').animationName).toBe('packing-pop-in');
    } finally {
      await setMotion('no-preference');
    }
  });

  test('a server echo of a committed name keeps focus on the next control', async () => {
    const onUpdate = vi.fn();
    const props = {
      onBring: noop,
      onRemove: noop,
      onUpdate,
      travelers: [],
      viewerUserId: undefined
    };
    const { rerender } = await render(
      <GroupGearItemEditor item={item({ bringers: [], brought: 0 })} {...props} />
    );
    const name = page.getByLabelText('Name of Tent');
    await name.click();
    await name.fill('Big tent');
    await userEvent.tab();
    expect(onUpdate).toHaveBeenCalledWith('item-1', { label: 'Big tent' });
    const next = document.activeElement;
    expect(next).not.toBe(name.element());
    await rerender(
      <GroupGearItemEditor
        item={item({ bringers: [], brought: 0, label: 'Big tent' })}
        {...props}
      />
    );
    expect(document.activeElement).toBe(next);
    await expect.element(page.getByLabelText('Name of Big tent')).toHaveValue('Big tent');
  });

  test('quick taps on a stepper while a write is in flight are coalesced, not dropped', async () => {
    const calls: number[] = [];
    const releases: (() => void)[] = [];
    const onBring = vi.fn(
      (_id: string, _user: string, count: number) =>
        new Promise<void>((resolve) => {
          calls.push(count);
          releases.push(resolve);
        })
    );
    await render(
      <GroupGearItemEditor
        item={item({ bringers: [{ count: 5, image: null, name: 'Ana', userId: 'ana' }] })}
        onBring={onBring}
        onRemove={noop}
        onUpdate={noop}
        travelers={[]}
        viewerUserId="me"
      />
    );
    const more = page.getByRole('button', { name: 'One more for Ana' });
    await more.click();
    await more.click();
    await more.click();
    expect(calls).toEqual([6]);
    releases[0]?.();
    await vi.waitFor(() => expect(calls).toEqual([6, 8]));
    releases[1]?.();
  });
});
