import { expect, test } from 'vitest';
import {
  assistantFormCatalog,
  assistantFormComponentIds,
  assistantFormInstructions
} from './index';

test('constrains generated forms to safe prebuilt chat components', () => {
  expect(assistantFormCatalog.componentNames).toEqual([...assistantFormComponentIds]);
  expect(assistantFormCatalog.componentNames).toEqual(
    expect.arrayContaining(['Card', 'Input', 'Radio', 'Recap', 'Select', 'Button'])
  );
  expect(assistantFormCatalog.componentNames).not.toEqual(
    expect.arrayContaining(['Dialog', 'Drawer', 'Image', 'Link'])
  );
  expect(assistantFormCatalog.actionNames).toEqual(['submitForm']);
  expect(assistantFormInstructions).toContain('```spec');
  expect(assistantFormInstructions).toContain('Never request passwords');
  expect(assistantFormInstructions).toContain('one or two traveler decisions');
});
