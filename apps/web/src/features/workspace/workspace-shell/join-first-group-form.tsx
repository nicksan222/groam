import { Button } from '@groam/ui/components/button';
import { FormFeedback } from '@groam/ui/components/form-feedback';
import { Input } from '@groam/ui/components/input';
import { Label } from '@groam/ui/components/label';
import { Spinner } from '@groam/ui/components/spinner';
import { useJoinGroup } from '@/features/workspace/hooks/use-join-group';
import { testIds } from '@/lib/test-ids';

export function JoinFirstGroupForm() {
  const join = useJoinGroup();

  return (
    <form className="space-y-3" onSubmit={(event) => void join.submit(event)}>
      <div className="grid gap-1.5">
        <Label htmlFor="first-organization-code">Invitation code</Label>
        <Input
          autoCapitalize="characters"
          autoComplete="off"
          data-testid={testIds.joinGroupCode}
          disabled={join.isPending}
          id="first-organization-code"
          onChange={(event) => join.setCode(event.target.value)}
          placeholder="ABCD-EFGH-JKLM"
          value={join.code}
        />
      </div>
      <FormFeedback error={join.error} />
      <Button className="w-full" disabled={join.isPending || !join.code.trim()} type="submit">
        {join.isPending && <Spinner />}
        Join group
      </Button>
    </form>
  );
}
