import { checkboxInputStrategy } from './checkbox-input';
import { radioInputStrategy } from './radio-input';
import { selectInputStrategy } from './select-input';
import { sliderInputStrategy } from './slider-input';
import { switchInputStrategy } from './switch-input';
import { textInputStrategy } from './text-input';
import { textareaInputStrategy } from './textarea-input';

/** Input rendering strategies keyed by the component IDs exposed to the assistant. */
export const assistantInputStrategies = {
  ...checkboxInputStrategy,
  ...radioInputStrategy,
  ...selectInputStrategy,
  ...sliderInputStrategy,
  ...switchInputStrategy,
  ...textInputStrategy,
  ...textareaInputStrategy
} as const;
