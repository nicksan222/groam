import { expect } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { ids } from '#src/testing/ids';
import { by } from './locators';
import { enter, tap } from './queries';

/** Adds a shared gear item from an idea's Packing tab. */
export async function addGroupGear(input: { label: string; quantity: number }): Promise<void> {
  await enter(page.getByLabelText('Group item'), input.label);
  await enter(page.getByLabelText('How many the group needs'), String(input.quantity));
  await tap(by(ids.tripPackingGearAdd));
  await expect.element(page.getByLabelText(`Name of ${input.label}`)).toBeVisible();
}

/** Claims the first listed gear item for the viewer ("I'll bring it"). */
export async function bringGearMyself(): Promise<void> {
  await tap(by(ids.tripPackingBringMe));
}

/** Adds an item to the viewer's private packing list. */
export async function addPersonalPackingItem(label: string): Promise<void> {
  await enter(by(ids.tripPackingPersonalInput), label);
  await tap(by(ids.tripPackingPersonalAdd));
  await expect.element(page.getByText(label, { exact: true })).toBeVisible();
}

/** Ticks an item on the viewer's private packing list. */
export async function packPersonalItem(label: string): Promise<void> {
  const box = page.getByRole('checkbox', { name: label, exact: true });
  await tap(box);
  await expect.element(box).toBeChecked();
}

/** On the shared trip, claims one of an item ("I'll bring one"), which starts an idea. */
export async function claimGearFromSharedTrip(label: string): Promise<void> {
  await tap(page.getByRole('button', { name: `I'll bring one ${label}` }));
  await tap(page.getByRole('button', { name: 'Create idea' }));
}
