import type { SendMessageAction } from '#src/actions/send-message';
import { ids } from '#src/playwright/ids';
import { type UiTarget, ui } from '#src/playwright/interaction';
import { chatMessage } from '#src/playwright/locators';

export const sendMessage: SendMessageAction<UiTarget> = async (target, input) => {
  const user = ui(target);
  const composer = user.page.getByTestId(`${ids.chatComposer}-input`);
  await user.type(composer, input.text);
  await user.press(composer, 'Enter');
  await chatMessage(user.page, input.text).waitFor();
};
