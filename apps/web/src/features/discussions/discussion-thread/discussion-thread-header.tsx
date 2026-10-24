import { MoreHorizontal } from '@groam/icons';
import Shell from '@groam/ui/components/shell/client';
import { SHELL_HEADER_FACT } from '@groam/ui/lib/shell-layout';
import type { ReactNode } from 'react';
import type { DiscussionListItem } from '@/features/discussions/hooks/use-discussions';
import { Link } from '@/features/workspace/navigation/router';
import { testIds } from '@/lib/test-ids';
import { DiscussionThreadMenu } from './discussion-thread-menu';

// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
export type DiscussionThreadHeaderLoadedProps = {
  back?: ThreadBack;
  discussion: DiscussionListItem;
  isLoading?: false;
};

// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
export type DiscussionThreadHeaderLoadingProps = {
  back?: ThreadBack;
  discussion?: undefined;
  isLoading: true;
};

// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
export type DiscussionThreadHeaderProps =
  | DiscussionThreadHeaderLoadedProps
  | DiscussionThreadHeaderLoadingProps;

/** Where the header's back arrow goes: the chat list. */
// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
export type ThreadBack = { label: string; target: { to: '/chat' } };

/**
 * A chat's page header: where it lives (Chats) and, under the title,
 * who is in it. `actions` sit before the thread's own menu, such as New chat on the chat page.
 */
export function DiscussionThreadHeader(
  props: DiscussionThreadHeaderProps & { actions?: ReactNode }
) {
  if (props.isLoading) return null;

  return (
    <DiscussionThreadHeaderReady
      actions={props.actions}
      back={props.back}
      discussion={props.discussion}
    />
  );
}

function DiscussionThreadHeaderReady({
  actions,
  back,
  discussion
}: {
  actions?: ReactNode;
  back?: ThreadBack;
  discussion: DiscussionListItem;
}) {
  const memberNames = discussion.members.map((member) => member.name).join(', ');

  return (
    <Shell.Header
      actions={
        <>
          {actions}
          <DiscussionThreadMenu
            discussion={discussion}
            trigger={(props) => (
              <Shell.Action
                className="shrink-0 touch-manipulation"
                icon={MoreHorizontal}
                iconOnly
                label="Thread actions"
                tone="secondary"
                {...props}
              />
            )}
          />
        </>
      }
      meta={
        <span className={SHELL_HEADER_FACT}>
          <span className="min-w-0 truncate">{memberNames}</span>
        </span>
      }
      parent={back ? <Link {...back.target}>Chat</Link> : <Link to="/chat">Chats</Link>}
      title={discussion.title}
      titleProps={{ 'data-testid': testIds.chatHeading }}
    />
  );
}
