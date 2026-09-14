import { shadcnComponents } from '@json-render/shadcn';
import { expect, test } from 'vitest';
import { sliderInputStrategy } from './slider-input';

test('registers the slider input strategy', () => {
  expect(sliderInputStrategy.Slider).toBe(shadcnComponents.Slider);
});
