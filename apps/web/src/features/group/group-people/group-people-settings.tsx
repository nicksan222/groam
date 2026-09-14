import { FormFeedback } from '@groam/ui/components/form-feedback';
import { Mail, Users } from 'lucide-react';
import { InvitationsSection } from '@/features/group/group-invitations/invitations-section';
import { MembersSection } from '@/features/group/group-members/members-section';
import { useGroupActions } from '@/features/group/hooks/use-group-actions';
import {
  SettingsPanel,
  SettingsPanelHeading,
  SettingsStack
} from '@/features/settings/settings-shell/settings-panel';
import { useWorkspace } from '@/features/workspace/workspace-shell/workspace-state';

export function GroupPeopleSettings() {
  const { activeOrganization, activeRole, session } = useWorkspace();
  const canManage = activeRole === 'owner' || activeRole === 'admin';
  const { cancelInvitation, error, leaveGroup, pendingAction, removeMember, updateMemberRole } =
    useGroupActions({
      organizationId: activeOrganization.id
    });

  return (
    <SettingsStack>
      <FormFeedback error={error} />
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
      <SettingsPanel>
        <SettingsPanelHeading
          description="People invited to join who have not accepted yet."
          icon={Mail}
          title="Invitations"
        />
        {activeOrganization.invitations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending invitations.</p>
        ) : (
          <InvitationsSection
            canManage={canManage}
            onCancel={(invitationId) => void cancelInvitation(invitationId)}
            organization={activeOrganization}
            pendingAction={pendingAction}
          />
        )}
      </SettingsPanel>
    </SettingsStack>
  );
}
