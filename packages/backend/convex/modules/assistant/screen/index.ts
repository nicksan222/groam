import { type AssistantScreen, validateAssistantScreen } from '@groam/ai-contracts/agents/screen';
import { ConvexError } from 'convex/values';

export type { AssistantScreen } from '@groam/ai-contracts/agents/screen';
export {
  assistantAgentValidator,
  assistantScreenValidator
} from '#convex/modules/assistant/validators/index';

/** Validates the UI snapshot attached to an assistant turn. */
// biome-ignore lint/complexity/noStaticOnlyClass: callers use this class, not loose functions
export class AssistantScreens {
  static validate(screen: AssistantScreen): void {
    try {
      validateAssistantScreen(screen);
    } catch (error: unknown) {
      throw new ConvexError(error instanceof Error ? error.message : 'Invalid screen context');
    }
  }
}
