import type { ComposerCommand } from '@/features/discussions/composer-commands/composer-command';
import type { LinkTargetOption, ResearchDetail, ResearchLink } from '@/types/research';

function includes(label: string, query: string) {
  return label.toLowerCase().includes(query.toLowerCase());
}

/** The "/" commands a research thread offers: summary, links, and (for managers) the brief. */
export function researchCommands({
  linkOptions,
  onLink,
  onSaveBrief,
  onSummarize,
  onUnlink,
  research
}: {
  linkOptions: LinkTargetOption[];
  onLink: (option: LinkTargetOption) => unknown;
  onSaveBrief: (brief: string) => unknown;
  onSummarize: () => unknown;
  onUnlink: (link: ResearchLink) => unknown;
  research: ResearchDetail;
}): ComposerCommand[] {
  const commands: ComposerCommand[] = [
    {
      description: 'Ask the researcher to summarize the findings so far',
      name: 'summarize',
      run: onSummarize
    },
    {
      argument: 'item',
      description: 'Link an issue, idea, or itinerary item of this trip',
      name: 'link',
      options: (query) =>
        linkOptions
          .filter((option) => includes(option.label, query))
          .map((option) => ({
            group: option.group,
            id: `${option.target.kind}:${option.target.id}`,
            label: option.label,
            run: () => onLink(option)
          }))
    }
  ];
  if (research.links.length > 0) {
    commands.push({
      argument: 'item',
      description: 'Remove a linked item',
      name: 'unlink',
      options: (query) =>
        research.links
          .filter((link) => includes(link.label, query))
          .map((link) => ({
            id: link.id,
            label: link.label,
            run: () => onUnlink(link)
          }))
    });
  }
  if (research.canManage) {
    commands.push({
      argument: 'text',
      description: 'Set the brief: what this research should answer',
      name: 'brief',
      run: onSaveBrief
    });
  }
  return commands;
}
