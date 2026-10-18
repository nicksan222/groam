import { FormFeedback } from '@groam/ui/components/form-feedback';
import { KeyRound, Users } from 'lucide-react';
import { InvitationsSection } from '@/features/group/group-invitations/invitations-section';
import { MembersSection } from '@/features/group/group-members/members-section';
import { useGroupActions } from '@/features/group/hooks/use-group-actions';
import { useInvitationCodes } from '@/features/group/hooks/use-invitation-codes';
import {
  SettingsPanel,
  SettingsPanelHeading,
  SettingsStack
} from '@/features/settings/settings-shell/settings-panel';
import { useWorkspace } from '@/features/workspace/workspace-shell/workspace-state';

export function GroupPeopleSettings() {
  const { activeOrganization, activeRole, session } = useWorkspace();
  const canManage = activeRole === 'owner' || activeRole === 'admin';
  const { error, leaveGroup, pendingAction, removeMember, updateMemberRole } = useGroupActions({
    organizationId: activeOrganization.id
  });
  const invitationCodes = useInvitationCodes(canManage);

  return (
    <SettingsStack>
      <FormFeedback error={error} />
      <FormFeedback error={invitationCodes.error} />
      <SettingsPanel>
        <SettingsPanelHeading
          description="Everyone here shares this group’s trips and planning workspace."
          icon={Users}
          title="Members"
        />
        <MembersSection
          canManage={canManage}
          onLeave={() => void leaveGroup()}
          onRemove={(memberId) => void removeMember(memberId)}
          onRoleChange={(memberId, role) => void updateMemberRole(memberId, role)}
          organization={activeOrganization}
          pendingAction={pendingAction}
          viewerUserId={session.user.id}
        />
      </SettingsPanel>
      {canManage && (
        <SettingsPanel>
          <SettingsPanelHeading
            description="One-time codes that have not been used or revoked. Codes expire after seven days."
            icon={KeyRound}
            title="Invitation codes"
          />
          {invitationCodes.codes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {invitationCodes.isLoading
                ? 'Loading invitation codes…'
                : 'No active invitation codes.'}
            </p>
          ) : (
            <InvitationsSection
              codes={invitationCodes.codes}
              onCopy={(code) => void navigator.clipboard.writeText(code)}
              onRevoke={(invitationCodeId) => void invitationCodes.revoke(invitationCodeId)}
              pendingId={invitationCodes.pendingId}
            />
          )}
        </SettingsPanel>
      )}
    </SettingsStack>
  );
}
