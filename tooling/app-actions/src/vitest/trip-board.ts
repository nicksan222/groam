import { expect } from 'vite-plus/test';
import { userEvent } from 'vite-plus/test/browser';
import { ids } from '#src/testing/ids';
import { openAppPath, reloadAppPage } from './app-host';
import { boardDraggable, boardLane, by, issueCard } from './locators';
import { tap } from './queries';

export type BoardLane = 'agreed' | 'review' | 'open' | 'in_progress' | 'closed' | 'wont_do';

/** Lanes in reading order; Left and Right walk through them while a card is lifted. */
const laneOrder: readonly BoardLane[] = [
  'agreed',
  'review',
  'open',
  'in_progress',
  'closed',
  'wont_do'
];

/** Opens a trip's Board tab directly. */
export async function openTripBoard(tripId: string): Promise<void> {
  await openAppPath(`trips/${tripId}/board`);
  await expect.element(by(ids.tripBoardScroller)).toBeVisible();
}

/** Waits until the board shows the issue's card inside the lane. */
export async function expectIssueInLane(title: string, lane: BoardLane): Promise<void> {
  await expect.element(issueCard(title)).toBeVisible();
  await expect
    .element(boardLane(lane).getByRole('link', { name: title, exact: true }))
    .toBeVisible();
}

/** The titles of the cards in a lane, top to bottom. */
export function laneTitles(lane: BoardLane): string[] {
  return boardLane(lane)
    .getByTestId(ids.tripBoardDraggable)
    .elements()
    .map((element) => element.querySelector('a, h3')?.textContent ?? '');
}

async function lift(title: string): Promise<void> {
  const draggable = boardDraggable(title);
  await expect.element(draggable).toBeVisible();
  draggable.element().focus();
  await userEvent.keyboard(' ');
}

async function hop(from: BoardLane, to: BoardLane): Promise<void> {
  const delta = laneOrder.indexOf(to) - laneOrder.indexOf(from);
  const key = delta > 0 ? '{ArrowRight}' : '{ArrowLeft}';
  for (let step = 0; step < Math.abs(delta); step += 1) {
    // oxlint-disable-next-line react-doctor/async-await-in-loop -- Each arrow press reads the position the last one reached.
    await userEvent.keyboard(key);
  }
}

function currentLane(title: string): BoardLane {
  const draggable = boardDraggable(title).element();
  const lane = draggable.closest('[data-lane]')?.getAttribute('data-lane');
  if (!lane) throw new Error(`The card "${title}" is not in a board lane`);
  return lane as BoardLane;
}

/**
 * Moves an issue card to another lane with the keyboard (lift with Space, hop with the arrows, drop
 * with Space). Dropping an issue into In progress opens its issue page, so the helper waits for
 * that page instead of the lane.
 */
export async function moveIssueOnBoard(title: string, lane: BoardLane): Promise<void> {
  const from = currentLane(title);
  await lift(title);
  await hop(from, lane);
  await userEvent.keyboard(' ');
  if (lane === 'in_progress' && from !== 'in_progress') {
    await expect.element(by(ids.issueHeading)).toBeVisible();
    return;
  }
  await expectIssueInLane(title, lane);
}

/**
 * Tries to move an issue into a lane the board refuses: checks the lane shows its refusal hint
 * while lifted, drops it, and checks the card stayed where it was.
 */
export async function expectIssueRefusedOnBoard(title: string, lane: BoardLane): Promise<void> {
  const from = currentLane(title);
  await lift(title);
  await hop(from, lane);
  const target = boardLane(lane);
  await expect.element(target).toHaveAttribute('data-drop', 'refused');
  await expect.element(by(ids.tripBoardDropHint, target)).toBeVisible();
  await userEvent.keyboard(' ');
  await expectIssueInLane(title, from);
}

/**
 * Moves a card one place up or down within its lane with the keyboard and returns the lane's new
 * order once it has been saved. The board shows no pending state while the order saves, so this
 * reloads until the saved order matches.
 */
export async function reorderIssueOnBoard(
  title: string,
  direction: 'down' | 'up'
): Promise<string[]> {
  const lane = currentLane(title);
  const before = laneTitles(lane);
  await lift(title);
  await userEvent.keyboard(direction === 'down' ? '{ArrowDown}' : '{ArrowUp}');
  await userEvent.keyboard(' ');
  await expect.poll(() => laneTitles(lane)).not.toEqual(before);
  const order = laneTitles(lane);
  await expect
    .poll(
      async () => {
        await reloadAppPage();
        await expect.element(boardLane(lane)).toBeVisible();
        return laneTitles(lane);
      },
      { timeout: 15_000 }
    )
    .toEqual(order);
  return order;
}

export type TripPageKind = 'history' | 'plan';

const tripPages = {
  history: { footer: ids.tripHistory, page: ids.tripHistoryPage },
  plan: { footer: ids.tripBoardPlanLink, page: ids.tripPlanPage }
} as const;

/** Follows the board's "See the full plan" or "Full history" footer link to its tab. */
export async function openTripPage(kind: TripPageKind): Promise<void> {
  const target = tripPages[kind];
  await tap(by(target.footer));
  await expect.element(by(target.page)).toBeVisible();
}

/** Switches back to the Board tab. */
export async function returnToBoard(): Promise<void> {
  await tap(by(ids.tripSectionBoard));
  await expect.element(by(ids.tripBoardScroller)).toBeVisible();
}
