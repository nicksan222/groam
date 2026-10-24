import { expect } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { ids } from '#src/testing/ids';
import { openAppPath } from './app-host';
import { named, queueRow } from './locators';
import { tap } from './queries';

/** The trip sections that list one kind of open thing. */
export type QueueSection = 'ideas' | 'issues' | 'polls';

/** Which side of the queue a row sits on: the open groups (turn or waiting) or Settled. */
export type QueueGroupKind = 'open' | 'settled';

/** The group headings that hold open rows, as the list's accessible name starts with them. */
const openGroupName = /^(?:Your turn|Waiting on others|Open)\b/u;
const settledGroupName = /^Settled\b/u;

/** The rows' list for one kind of group. A folded group renders no list, so nothing matches. */
function groupLists(among: QueueGroupKind) {
  return page.getByRole('list', { name: among === 'settled' ? settledGroupName : openGroupName });
}

/** A queue row by title, scoped to the open groups or the Settled group. */
export function queueRowIn(title: string, among: QueueGroupKind) {
  return queueRow(title, groupLists(among));
}

/**
 * Unfolds the Settled group when it is folded (open groups are always expanded). When Settled is
 * the only group it cannot fold, so its heading is no button and its rows already show. Waits for
 * either first: the groups render reactively, so a one-shot query can run before they exist.
 */
export async function showQueue(): Promise<void> {
  const heading = page.getByRole('button', { name: settledGroupName });
  const rows = groupLists('settled');
  await expect
    .poll(() => heading.elements().length + rows.elements().length, {
      message: 'The Settled group to render'
    })
    .toBeGreaterThan(0);
  if (heading.elements().length === 0) return;
  if (heading.element().getAttribute('aria-expanded') === 'false') await tap(heading);
  await expect.element(heading).toHaveAttribute('aria-expanded', 'true');
}

/** Opens one of a trip's queues (Ideas, Issues, or Polls) directly and waits for it. */
export async function openTripQueue(tripId: string, section: QueueSection): Promise<void> {
  await openAppPath(`trips/${tripId}/${section}`);
  await expect.element(named(ids.queuePanel, 'data-section', section)).toBeVisible();
}

/**
 * Waits until the queue lists the item in the given group, unfolding Settled when it is a settled
 * one. An item in the other group does not satisfy it.
 */
export async function expectQueueItem(title: string, among: QueueGroupKind): Promise<void> {
  if (among === 'settled') await showQueue();
  await expect.element(queueRowIn(title, among)).toBeVisible();
}
