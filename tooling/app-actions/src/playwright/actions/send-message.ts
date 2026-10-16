import type { SendMessageAction } from '#src/actions/send-message';
import { type UiTarget, ui } from '#src/playwright/interaction';
import { chatMessage } from '#src/playwright/locators';
import { ids } from '#src/testing/ids';

export const sendMessage: SendMessageAction<UiTarget> = async (target, input) => {
  const user = ui(target);
  const composer = user.page.getByTestId(`${ids.chatComposer}-input`);
  await user.type(composer, input.text);
  await user.press(composer, 'Enter');
  await chatMessage(user.page, input.text).waitFor();
};
