import { render } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import { AddGearForm } from './add-gear-form';
import { GroupGearBringerChips } from './group-gear-bringer-chips';
import { GroupGearSummary } from './group-gear-summary';
import { PackingProgress } from './packing-progress';
import { PersonalPackingRow } from './personal-packing-row';

const me = { count: 1, image: null, name: 'Me Myself', userId: 'me' };
const gear = (brought: number, quantity: number, bringers = brought ? [me] : []) =>
  ({ bringers, brought, id: 'i1', label: 'Tent', quantity }) as never;

describe('packing motion', () => {
  test('progress is segmented for small quantities and continuous for large ones', async () => {
    const { container } = await render(
      <>
        <PackingProgress state="missing" total={3} value={1} />
        <PackingProgress state="covered" total={20} value={10} />
      </>
    );
    const bars = container.querySelectorAll('[data-slot="packing-progress"]');
    expect(bars[0]?.getAttribute('data-segments')).toBe('3');
    expect(
      [...bars[0]!.querySelectorAll('[data-filled]')].map((f) => f.getAttribute('data-filled'))
    ).toEqual(['true', 'false', 'false']);
    expect(bars[1]?.getAttribute('data-segments')).toBeNull();
    expect(bars[1]?.querySelectorAll('[data-filled]')).toHaveLength(1);
  });

  test('a new bringer chip enters, existing ones do not', async () => {
    const { container, rerender } = await render(
      <GroupGearBringerChips item={gear(1, 2)} viewerUserId="me" />
    );
    expect(container.querySelector('[data-entering]')).toBeNull();
    const ana = { count: 1, image: null, name: 'Ana', userId: 'ana' };
    await rerender(<GroupGearBringerChips item={gear(2, 2, [me, ana])} viewerUserId="me" />);
    const entering = container.querySelectorAll('[data-entering="true"]');
    expect(entering).toHaveLength(1);
    expect(entering[0]?.getAttribute('title')).toBe('Ana');
  });

  test('summary says everything is covered, animating only after it changes', async () => {
    const { container, rerender } = await render(<GroupGearSummary items={[gear(1, 2)]} />);
    expect(container.textContent).toContain('0 of 1 items covered');
    await rerender(<GroupGearSummary items={[gear(2, 2)]} />);
    expect(container.textContent).toContain("Everything's covered");
    expect(container.querySelector('[data-changed="true"]')).not.toBeNull();
  });

  test('summary starts calm when already covered', async () => {
    const { container } = await render(<GroupGearSummary items={[gear(2, 2)]} />);
    expect(container.textContent).toContain("Everything's covered");
    expect(container.querySelector('[data-changed]')).toBeNull();
  });

  test('ticking a personal item draws the check; loaded packed items stay still', async () => {
    const item = { id: 'p1', label: 'Charger', packed: false };
    const props = { onRemove: () => {}, onTogglePacked: () => {}, readOnly: false };
    const { container, rerender } = await render(
      <PersonalPackingRow {...props} item={item as never} />
    );
    expect(container.querySelector('.packing-check-draw')).toBeNull();
    await rerender(<PersonalPackingRow {...props} item={{ ...item, packed: true } as never} />);
    expect(container.querySelector('[data-packed="true"]')).not.toBeNull();
    expect(container.querySelector('.packing-check-draw')).not.toBeNull();
    const loaded = await render(
      <PersonalPackingRow {...props} item={{ ...item, packed: true } as never} />
    );
    expect(loaded.container.querySelector('.packing-check-draw')).toBeNull();
  });

  test('starter chips step aside once typing begins', async () => {
    const { container } = await render(<AddGearForm empty onAdd={async () => true} />);
    const starters = () => container.querySelector('[data-leaving]');
    expect(starters()).toBeNull();
    await userEvent.type(page.getByLabelText('Group item').element() as HTMLElement, 'T');
    expect(starters()?.getAttribute('aria-hidden')).toBe('true');
    expect(starters()?.hasAttribute('inert')).toBe(true);
  });
});
