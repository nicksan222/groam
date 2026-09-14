import { type UiTarget, ui } from './interaction';

export async function openCurrentPageOn(target: UiTarget, source: UiTarget): Promise<void> {
  await ui(target).page.goto(new URL(ui(source).page.url()).pathname);
}
