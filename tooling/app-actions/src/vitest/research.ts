import { expect } from 'vite-plus/test';
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
  await expect.element(section.getByRole('button', { name: subject })).toBeVisible();
}

/** Opens a research listed in the open page's Research section. */
export async function openLinkedResearch(subject: string): Promise<void> {
  await tap(by(ids.linkedResearchesSection).getByRole('button', { name: subject }));
  await expect.element(by(ids.researchHeader)).toBeVisible();
}

/** Asserts the open page's Research section lists the research. */
export async function expectLinkedResearch(subject: string): Promise<void> {
  await expect
    .element(by(ids.linkedResearchesSection).getByRole('button', { name: subject }))
    .toBeVisible();
}
