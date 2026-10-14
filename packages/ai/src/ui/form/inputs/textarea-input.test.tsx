import { shadcnComponents } from '@json-render/shadcn';
import { expect, test } from 'vite-plus/test';
import { textareaInputStrategy } from './textarea-input';

test('registers the textarea input strategy', () => {
  expect(textareaInputStrategy.Textarea).toBe(shadcnComponents.Textarea);
});
