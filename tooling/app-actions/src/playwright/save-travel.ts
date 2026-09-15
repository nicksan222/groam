import { type Page, expect as playwrightExpect } from '@playwright/test';
import { ids } from './ids';
import { by, planTravel } from './locators';
import { transferPdf } from './transfer-pdf';

const expect = playwrightExpect.configure({ timeout: 30_000 });

export type SaveTravelInput = {
  from: string;
  minutes: string;
  notes: string;
  to: string;
};

export async function saveTravel(page: Page, input: SaveTravelInput): Promise<void> {
  await planTravel(page, input.from, input.to).click();
  await by(page, ids.travelMinutes).fill(input.minutes);
  await by(page, ids.travelNotes).fill(input.notes);
  await by(page, ids.travelUpload).setInputFiles({
    buffer: transferPdf,
    mimeType: 'application/pdf',
    name: 'travel.pdf'
  });
  await expect(by(page, ids.travelSave)).toBeEnabled();
  await by(page, ids.travelSave).click();
}
