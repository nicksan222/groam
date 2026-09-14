import * as z from 'zod';
import { AssistantFormComponentKind } from '#ai-contracts/output/kind';

export class RecapFormComponent extends AssistantFormComponentKind {
  constructor() {
    super({
      definition: {
        description:
          'A polished, compact recap card for a completed review, plan, or recommendation. Use it to make a useful answer scannable.',
        example: {
          highlights: ['3 stops planned', '2 decisions still need approval'],
          summary: 'Your Portugal route is ready for a final group review.',
          title: 'Portugal trip recap',
          tone: 'positive'
        },
        props: z.object({
          highlights: z.array(z.string().min(1).max(120)).max(4),
          summary: z.string().min(1).max(360),
          title: z.string().min(1).max(100),
          tone: z.enum(['default', 'positive', 'warning']).nullable()
        })
      },
      id: 'Recap'
    });
  }
}
