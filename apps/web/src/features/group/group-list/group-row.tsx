import { Check } from '@groam/icons';
import { Avatar } from '@groam/ui/components/avatar';
import { AvatarFallback } from '@groam/ui/components/avatar-fallback';
import { AvatarImage } from '@groam/ui/components/avatar-image';
import { Button } from '@groam/ui/components/button';
import { List } from '@groam/ui/components/list';
import { initials } from '@groam/ui/lib/avatar';
import { useId } from 'react';
import { testIds } from '@/lib/test-ids';

/** One group you belong to: marked Current, or with a Switch button named by the group. */
export function GroupRow({
  current,
  logo,
  name,
  onSwitch
}: {
  current: boolean;
  logo: string | null | undefined;
  name: string;
  onSwitch: () => void;
}) {
  const nameId = useId();
  const buttonId = useId();
  return (
    <List.Row data-group-name={name}>
      <List.Icon media>
        <Avatar className="size-8 rounded-md">
          <AvatarImage alt="" src={logo ?? ''} />
          <AvatarFallback className="rounded-md bg-muted text-xs font-semibold">
            {initials(name)}
          </AvatarFallback>
        </Avatar>
      </List.Icon>
      <List.Main>
        <List.Title id={nameId}>{name}</List.Title>
      </List.Main>
      <List.Actions>
        {current ? (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Check aria-hidden className="size-3.5" /> Current
          </span>
        ) : (
          <Button
            aria-labelledby={`${buttonId} ${nameId}`}
            data-testid={testIds.settingsGroupSwitch}
            id={buttonId}
            onClick={onSwitch}
            size="sm"
            type="button"
            variant="outline"
          >
            Switch
          </Button>
        )}
      </List.Actions>
    </List.Row>
  );
}
