import { expectTypeOf, test } from 'vitest';
import type {
  DesktopRightColumnProps,
  LeftColumnProps,
  RightColumnProps,
  TwoColumnsProps
} from '#src/components/shell/types/columns';

test('scaffold types reject custom geometry and independent sidebar breakpoints', () => {
  expectTypeOf<TwoColumnsProps['className']>().toEqualTypeOf<undefined>();
  expectTypeOf<LeftColumnProps['style']>().toEqualTypeOf<undefined>();
  expectTypeOf<RightColumnProps['className']>().toEqualTypeOf<undefined>();
  expectTypeOf<DesktopRightColumnProps['className']>().toEqualTypeOf<undefined>();
  expectTypeOf<RightColumnProps>().not.toHaveProperty('breakpoint');
  expectTypeOf<TwoColumnsProps>().not.toHaveProperty('rightWidth');
  expectTypeOf<TwoColumnsProps>().not.toHaveProperty('gap');
  expectTypeOf<TwoColumnsProps>().not.toHaveProperty('breakpoint');
  expectTypeOf<LeftColumnProps>().not.toHaveProperty('stack');
  expectTypeOf<RightColumnProps>().not.toHaveProperty('sticky');
  expectTypeOf<RightColumnProps>().not.toHaveProperty('order');
  expectTypeOf<{ children: null; as: 'button' }>().not.toExtend<TwoColumnsProps>();
});
