import {
  Composer,
  ComposerInput,
  ComposerItem,
  type ComposerItemValue,
  ComposerList,
  ComposerPopup,
  type ComposerValue
} from '@groam/ui/components/composer';
import { render } from '@groam/vitest-config/react';
import { useState } from 'react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { ComposerCommandButton } from './composer-command-button';

function Harness({ initial }: { initial: string }) {
  const [value, setValue] = useState<ComposerValue>(
    initial ? [{ text: initial, type: 'text' }] : []
  );
  return (
    <Composer
      onValueChange={setValue}
      triggers={[{ character: '/', items: [{ id: 'poll', label: 'poll' }] }]}
      value={value}
    >
      <ComposerInput aria-label="Message" />
      <ComposerPopup>
        <ComposerList>
          {(item: ComposerItemValue) => (
            <ComposerItem key={item.id} value={item}>
              {item.label}
            </ComposerItem>
          )}
        </ComposerList>
      </ComposerPopup>
      <ComposerCommandButton />
    </Composer>
  );
}

test('starts a command from an empty composer', async () => {
  await render(<Harness initial="" />);
  await page.getByRole('button', { name: 'Commands' }).click();
  await expect.element(page.getByRole('textbox', { name: 'Message' })).toHaveTextContent('/');
  await expect.element(page.getByRole('option', { name: 'poll' })).toBeInTheDocument();
});

test('never overwrites a draft', async () => {
  await render(<Harness initial="draft" />);
  await expect.element(page.getByRole('button', { name: 'Commands' })).toBeDisabled();
});
