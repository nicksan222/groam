import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { DestinationControls } from './destination-controls';

function renderControls(props: Partial<Parameters<typeof DestinationControls>[0]> = {}) {
  const onMove = vi.fn();
  const onRemove = vi.fn();
  return {
    onMove,
    onRemove,
    ready: render(
      <DestinationControls
        canManage
        isMoving={null}
        isRemoving={false}
        name="Lisbon"
        nextName="Porto"
        onMove={onMove}
        onRemove={onRemove}
        previousName="Madrid"
        {...props}
      />
    )
  };
}

const trigger = () => page.getByRole('button', { name: 'Reorder or remove Lisbon' });

describe('DestinationControls', () => {
  test('renders nothing for viewers who cannot manage the trip', async () => {
    await renderControls({ canManage: false }).ready;
    await expect.element(trigger()).not.toBeInTheDocument();
  });

  test.each([
    ['moving earlier', { isMoving: 'earlier' as const }],
    ['moving later', { isMoving: 'later' as const }],
    ['removing', { isRemoving: true }]
  ])('disables the trigger while %s', async (_, props) => {
    await renderControls(props).ready;
    await expect.element(trigger()).toBeDisabled();
  });

  test('names the neighbouring stops and moves earlier', async () => {
    const { onMove, ready } = renderControls();
    await ready;
    await trigger().click();
    await expect.element(page.getByRole('menuitem', { name: 'Move after Porto' })).toBeVisible();
    await page.getByRole('menuitem', { name: 'Move before Madrid' }).click();
    expect(onMove).toHaveBeenCalledWith('earlier');
  });

  test('moves later', async () => {
    const { onMove, ready } = renderControls();
    await ready;
    await trigger().click();
    await page.getByRole('menuitem', { name: 'Move after Porto' }).click();
    expect(onMove).toHaveBeenCalledWith('later');
  });

  test('disables moves that have no neighbour', async () => {
    const { onMove, ready } = renderControls({ nextName: undefined, previousName: undefined });
    await ready;
    await trigger().click();
    await expect
      .element(page.getByRole('menuitem', { name: 'Move before previous stop' }))
      .toHaveAttribute('data-disabled');
    await expect
      .element(page.getByRole('menuitem', { name: 'Move after next stop' }))
      .toHaveAttribute('data-disabled');
    expect(onMove).not.toHaveBeenCalled();
  });

  test('removes the stop', async () => {
    const { onRemove, ready } = renderControls();
    await ready;
    await trigger().click();
    await page.getByRole('menuitem', { name: 'Remove stop' }).click();
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
