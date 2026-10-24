import { type AssistantScreen, validateAssistantScreen } from '@groam/ai/runtime/screen';
import { ConvexError } from 'convex/values';

export type { AssistantScreen } from '@groam/ai/runtime/screen';
export {
  assistantAgentValidator,
  assistantScreenValidator
} from '#convex/modules/assistant/validators/index';

/** Validates the UI snapshot attached to an assistant turn. */
// oxlint-disable-next-line unicorn/no-static-only-class -- callers use this class, not loose functions
export class AssistantScreens {
  static validate(screen: AssistantScreen): void {
    try {
      validateAssistantScreen(screen);
    } catch (error: unknown) {
      throw new ConvexError(error instanceof Error ? error.message : 'Invalid screen context');
    }
  }
}
