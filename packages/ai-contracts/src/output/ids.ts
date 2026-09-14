export const assistantFormComponentIds = [
  'Alert',
  'Button',
  'Card',
  'Checkbox',
  'Heading',
  'Input',
  'Radio',
  'Recap',
  'Select',
  'Separator',
  'Slider',
  'Stack',
  'Switch',
  'Text',
  'Textarea'
] as const;

export type AssistantFormComponentId = (typeof assistantFormComponentIds)[number];
