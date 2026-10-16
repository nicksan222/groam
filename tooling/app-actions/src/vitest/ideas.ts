import { expect } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { ids } from '#src/testing/ids';
import { openAppPath } from './app-host';
import { by, dialogSubmit, ideaRow } from './locators';
import { expectGone, expectPath, idFromPath, inOrder, tap, enter } from './queries';

export type OpenIdeaInput = { proposalId: string; tripId: string };

/**
 * Opens an idea's overview directly, typically one arranged through the backend, and returns
 * the short ids the app canonicalizes its URL to.
 */
export async function openIdea(input: OpenIdeaInput): Promise<OpenIdeaInput> {
  await openAppPath(`trips/${input.tripId}/ideas/${input.proposalId}/overview`);
  await expect.element(by(ids.ideaWorkspace)).toBeVisible();
  await expect.element(by(ids.tripHeading)).toBeVisible();
  await expectPath(/\/trips\/[a-z]{6}\/ideas\/[a-z]{6}\/overview/u);
  return { proposalId: idFromPath('ideas'), tripId: idFromPath('trips') };
}

export async function openWorkspaceIdeas(): Promise<void> {
  await tap(by(ids.navIdeas));
  await expectPath(/\/ideas\/?$/u);
  await expect.element(by(ids.ideasTitle)).toBeVisible();
}

/**
 * Opens an idea from the workspace Ideas list. The author's own draft offers `continue`; every
 * other idea (in review, or someone else's) offers `view`.
 */
export async function openIdeaFromList(
  idea: { name: string } | { title: string },
  action: 'continue' | 'view'
): Promise<void> {
  await openWorkspaceIdeas();
  await tap(by(action === 'continue' ? ids.ideaContinue : ids.ideaView, ideaRow(idea)));
  await expectPath(/\/(?:trips\/[^/]+\/)?ideas\/[^/?]+/u);
}

export async function filterWorkspaceIdeas(
  status: 'Open' | 'Settled',
  titles: readonly string[]
): Promise<void> {
  await openWorkspaceIdeas();
  await tap(page.getByLabelText('Filter ideas by status'));
  await tap(page.getByRole('option', { name: status }));
  await inOrder(titles, async (title) => {
    await expect.element(ideaRow({ title })).toBeVisible();
  });
}

/** Starts an idea from the trip toolbar and returns the short idea id from the URL. */
export async function addIdea(input: { name: string }): Promise<string> {
  await tap(by(ids.sharedTripNewIdea));
  await expect.element(by(ids.startIdeaDialog)).toBeVisible();
  await enter(by(ids.startIdeaName), input.name);
  await tap(dialogSubmit(ids.startIdeaDialog));
  await expectGone(by(ids.startIdeaDialog));
  await expectPath(/\/trips\/[^/]+\/ideas\/[^/]+/u);
  await expect.element(by(ids.tripHeading)).toBeVisible();
  return idFromPath('ideas');
}

export async function startWorkspaceIdea(input: { title: string; tripName: string }) {
  await openWorkspaceIdeas();
  await tap(by(ids.startIdea));
  const dialog = by(ids.startIdeaDialog);
  await expect.element(dialog).toBeVisible();
  await tap(dialog.getByRole('combobox', { name: 'Trip' }));
  await tap(page.getByRole('option', { name: input.tripName }));
  await enter(by(ids.startIdeaName), input.title);
  await tap(dialogSubmit(ids.startIdeaDialog));
  await expectGone(dialog);
  await expect.element(by(ids.ideaWorkspace)).toBeVisible();
}

export async function closeIdea(reason?: string): Promise<void> {
  const label = reason === undefined ? 'Delete draft' : 'Close without applying';
  await tap(page.getByRole('button', { name: 'Idea actions' }));
  await tap(page.getByRole('menuitem', { name: label }));
  const dialog = page.getByRole('dialog');
  await expect.element(dialog).toBeVisible();
  if (reason !== undefined) {
    await expect.element(dialog.getByRole('button', { name: label })).toBeDisabled();
    await enter(by(ids.closeIdeaReason, dialog), reason);
  }
  await tap(dialog.getByRole('button', { name: label }));
  await expectGone(dialog);
}

export async function openIdeaComparison(): Promise<void> {
  await tap(by(ids.ideaSectionCompare));
  await expect.element(by(ids.compareSharedTrip)).toBeVisible();
}

export const openIdeaItinerary = () => tap(by(ids.tripSectionItinerary));

export async function requestIdeaReview(): Promise<void> {
  const compareTab = by(ids.ideaSectionCompare);
  await expect.element(compareTab).toBeVisible();
  await tap(compareTab);
  await expect.element(by(ids.requestReview).first()).toBeEnabled();
  await tap(by(ids.requestReview).first());
  await expectGone(by(ids.requestReview));
}

export async function approveIdea(): Promise<void> {
  const approval = by(ids.approveIdea).first();
  await tap(approval);
  await expect.element(approval).toMatchTextContent(/Remove approval/u);
}

export async function applyIdea(): Promise<void> {
  const apply = by(ids.applyIdea).first();
  await expect.element(apply).toBeEnabled();
  await tap(apply);
  await expect
    .element(page.getByRole('heading', { name: 'Apply this idea to the shared trip?' }))
    .toBeVisible();
  await tap(by(ids.applyIdeaConfirm));
  await expectGone(by(ids.applyIdeaConfirm));
  await expect.element(page.getByText('Applied to the shared trip').first()).toBeVisible();
}

export async function approveAndApplyIdea(): Promise<void> {
  await approveIdea();
  await applyIdea();
}

export async function returnIdeaToEditing(): Promise<void> {
  await tap(page.getByRole('button', { name: 'Idea actions' }));
  await tap(page.getByRole('menuitem', { name: 'Back to editing' }));
  await expectPath(/\/itinerary(?:\?.*)?$/u);
  await expect.element(page.getByRole('region', { name: 'Itinerary editor' })).toBeVisible();
}

export async function reviewIdeaChange(input: { change: string; comment: string }): Promise<void> {
  await tap(by(ids.ideaSectionCompare));
  const change = by(ids.compareSharedTrip).getByRole('article').filter({ hasText: input.change });
  await expect.element(change.getByText(input.change)).toBeVisible();
  await tap(change.getByRole('button', { name: /^Comment on /u }));
  await enter(change.getByRole('textbox'), input.comment);
  await tap(change.getByRole('button', { name: 'Add comment' }));
  await expectGone(change.getByRole('textbox'));
  await expect.element(change).toMatchTextContent(input.comment);
}

export type TripDetailConflictChoice = { field: string; source: 'idea' | 'shared' };

export type ResolveTripDetailConflictInput = {
  choices?: readonly TripDetailConflictChoice[];
  expectedBranches?: readonly { field: string; idea: string; shared: string }[];
  expectedPreview?: readonly string[];
  expectedSides?: readonly string[];
};

export async function resolveTripDetailConflict(
  input: ResolveTripDetailConflictInput
): Promise<void> {
  await tap(by(ids.itineraryDetailsResolve));
  const dialog = page.getByRole('dialog', { name: 'Choose what to keep — trip details' });
  const sides = dialog.getByLabelText('Compared sides');
  await inOrder(input.expectedSides ?? [], async (side) => {
    await expect.element(sides).toMatchTextContent(side);
  });
  await inOrder(input.expectedBranches ?? [], async (branch) => {
    const shared = dialog.getByRole('region', { name: `Shared trip branch for ${branch.field}` });
    const idea = dialog.getByRole('region', { name: `This idea branch for ${branch.field}` });
    await expect.element(shared).toMatchTextContent(branch.shared);
    await expect.element(idea).toMatchTextContent(branch.idea);
  });
  await tap(dialog.getByRole('button', { name: 'Keep all mine' }));
  await inOrder(input.choices ?? [], (choice) => {
    const source = choice.source === 'shared' ? 'shared trip' : 'this idea';
    return tap(dialog.getByRole('button', { name: `Keep ${source} for ${choice.field}` }));
  });
  await tap(dialog.getByRole('button', { name: 'Review result' }));
  const preview = dialog.getByRole('region', { name: 'Result preview' });
  await inOrder(input.expectedPreview ?? [], async (value) => {
    await expect.element(preview.getByText(value)).toBeVisible();
  });
  await tap(by(ids.itineraryDetailsResolveApply));
  await expectGone(dialog);
}
