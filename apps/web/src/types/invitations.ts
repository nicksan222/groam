export type InvitationAction = 'accept' | 'reject';

export type InvitationDetails = {
  email: string;
  id: string;
  inviterEmail: string;
  organizationName: string;
  role: string;
};
