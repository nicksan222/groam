import { expect } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { ids } from '#src/testing/ids';
import { by, dialogSubmit } from './locators';
import { enter, tap } from './queries';

/** Starts a research from the open issue or idea's Research section, already linked to it. */
export async function createLinkedResearch(subject: string): Promise<void> {
  const section = by(ids.linkedResearchesSection);
  await tap(by(ids.linkResearchNew, section));
  await expect.element(by(ids.createResearchDialog)).toBeVisible();
  await enter(by(ids.createResearchSubject), subject);
  await tap(dialogSubmit(ids.createResearchDialog));
  await expect
    .element(section.getByRole('link', { name: `Open research: ${subject}`, exact: true }))
    .toBeVisible();
}

/** Opens a research listed in the open page's Research section. */
export async function openLinkedResearch(subject: string): Promise<void> {
  await tap(
    by(ids.linkedResearchesSection).getByRole('link', {
      name: `Open research: ${subject}`,
      exact: true
    })
  );
  await expect.element(by(ids.researchHeader)).toBeVisible();
}

/** Asserts the open page's Research section lists the research. */
export async function expectLinkedResearch(subject: string): Promise<void> {
  await expect
    .element(
      by(ids.linkedResearchesSection).getByRole('link', {
        name: `Open research: ${subject}`,
        exact: true
      })
    )
    .toBeVisible();
}

/** Waits for the research notebook; notes sit inline with the research history. */
export async function openResearchNotes(): Promise<void> {
  await expect.element(page.getByRole('region', { name: 'Research notebook' })).toBeVisible();
}

/** Saves a group contribution through the research notebook, without starting an AI run. */
export async function addResearchNote(text: string): Promise<void> {
  await openResearchNotes();
  const notebook = page.getByRole('region', { name: 'Research notebook' });
  await tap(notebook.getByRole('button', { name: 'Add a note', exact: true }));
  await enter(notebook.getByRole('textbox', { name: 'Research note' }), text);
  await tap(notebook.getByRole('button', { name: 'Add note', exact: true }));
  await expect.element(notebook.getByText(text, { exact: true })).toBeVisible();
  await expect.element(notebook.getByRole('textbox', { name: 'Research note' })).toHaveValue('');
}
