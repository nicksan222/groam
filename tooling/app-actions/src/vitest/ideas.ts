import { expect } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { ids } from '#src/testing/ids';
import { openAppPath } from './app-host';
import { by, dialogSubmit, ideaRow } from './locators';
import { openTripSection } from './open-trips';
import { expectPath, idFromPath, isVisible, tap, enter } from './queries';

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

export async function openIdeaFromList(ideaName: string): Promise<void> {
  await openWorkspaceIdeas();
  const row = ideaRow(ideaName);
  await expect.element(row).toBeVisible();
  const continueDraft = row.getByTestId(ids.ideaContinue);
  await tap(isVisible(continueDraft) ? continueDraft : row.getByTestId(ids.ideaView));
  await expectPath(/\/(?:trips\/[^/]+\/)?ideas\/[^/?]+/u);
}

export async function filterWorkspaceIdeas(
  status: 'Open' | 'Settled',
  titles: readonly string[]
): Promise<void> {
  await openWorkspaceIdeas();
  await tap(page.getByLabelText('Filter ideas by status'));
  await tap(page.getByRole('option', { name: status }));
  for (const title of titles) {
    // oxlint-disable-next-line react-doctor/async-await-in-loop -- Vitest requires each expect.element to be awaited.
    await expect.element(ideaRow(title)).toBeVisible();
  }
}

/** Starts an idea from the trip's Ideas tab and returns the short idea id from the URL. */
export async function addIdea(input: { name: string }): Promise<string> {
  await openTripSection('ideas');
  await tap(by(ids.sharedTripNewIdea));
  await expect.element(by(ids.startIdeaDialog)).toBeVisible();
  await enter(by(ids.startIdeaName), input.name);
  await tap(dialogSubmit(ids.startIdeaDialog));
  await expect.element(by(ids.startIdeaDialog)).not.toBeInTheDocument();
  await expectPath(/\/trips\/[^/]+\/ideas\/[^/]+/u);
  await expect.element(by(ids.tripHeading)).toBeVisible();
  return /\/ideas\/([^/?]+)/u.exec(location.pathname)?.[1] ?? '';
}

export async function startWorkspaceIdea(input: { title: string; tripName: string }) {
  await openWorkspaceIdeas();
  const startButton = by(ids.startIdea);
  await tap(
    isVisible(startButton) ? startButton : page.getByRole('button', { name: 'Start an idea' })
  );
  const dialog = by(ids.startIdeaDialog);
  await expect.element(dialog).toBeVisible();
  await tap(dialog.getByRole('combobox', { name: 'Trip' }));
  await tap(page.getByRole('option', { name: input.tripName }));
  await enter(by(ids.startIdeaName), input.title);
  await tap(dialogSubmit(ids.startIdeaDialog));
  await expect.element(dialog).not.toBeInTheDocument();
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
  await expect.element(dialog).not.toBeInTheDocument();
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
  await expect.poll(() => by(ids.requestReview).elements().length).toBe(0);
}

export async function approveIdea(approved = true): Promise<void> {
  const approval = by(ids.approveIdea).first();
  await expect.element(approval).toBeVisible();
  const isApproved = approval.element().textContent?.includes('Remove approval') ?? false;
  if (isApproved === approved) return;
  await tap(approval);
  await expect.element(approval).toMatchTextContent(approved ? /Remove approval/u : /Approve/u);
}

export const revokeIdeaApproval = () => approveIdea(false);

export async function applyIdea(): Promise<void> {
  const apply = by(ids.applyIdea).first();
  await expect.element(apply).toBeEnabled();
  await tap(apply);
  await expect
    .element(page.getByRole('heading', { name: 'Apply this idea to the shared trip?' }))
    .toBeVisible();
  await tap(by(ids.applyIdeaConfirm));
  await expect.poll(() => by(ids.applyIdeaConfirm).elements().length).toBe(0);
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
  await expect.poll(() => change.getByRole('textbox').elements().length).toBe(0);
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
  for (const side of input.expectedSides ?? []) {
    // oxlint-disable-next-line react-doctor/async-await-in-loop -- Vitest requires each expect.element to be awaited.
    await expect.element(sides).toMatchTextContent(side);
  }
  for (const branch of input.expectedBranches ?? []) {
    const shared = dialog.getByRole('region', { name: `Shared trip branch for ${branch.field}` });
    const idea = dialog.getByRole('region', { name: `This idea branch for ${branch.field}` });
    // oxlint-disable-next-line react-doctor/async-await-in-loop -- Vitest requires each expect.element to be awaited.
    await expect.element(shared).toMatchTextContent(branch.shared);
    await expect.element(idea).toMatchTextContent(branch.idea);
  }
  await tap(dialog.getByRole('button', { name: 'Keep all mine' }));
  for (const choice of input.choices ?? []) {
    const source = choice.source === 'shared' ? 'shared trip' : 'this idea';
    // oxlint-disable-next-line react-doctor/async-await-in-loop -- Each choice updates the dialog the next one reads.
    await tap(dialog.getByRole('button', { name: `Keep ${source} for ${choice.field}` }));
  }
  await tap(dialog.getByRole('button', { name: 'Review result' }));
  const preview = dialog.getByRole('region', { name: 'Result preview' });
  for (const value of input.expectedPreview ?? []) {
    // oxlint-disable-next-line react-doctor/async-await-in-loop -- Vitest requires each expect.element to be awaited.
    await expect.element(preview.getByText(value)).toBeVisible();
  }
  await tap(by(ids.itineraryDetailsResolveApply));
  await expect.element(dialog).not.toBeInTheDocument();
}
