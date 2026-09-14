export type ResetTarget = {
  component: string;
  table: string;
};

export const componentResetTargets: ResetTarget[] = [
  { component: 'geospatial', table: 'pointsByCell' },
  { component: 'geospatial', table: 'pointsByFilterKey' },
  { component: 'geospatial', table: 'approximateCounters' },
  { component: 'geospatial', table: 'points' },
  { component: 'betterAuth', table: 'session' },
  { component: 'betterAuth', table: 'account' },
  { component: 'betterAuth', table: 'verification' },
  { component: 'betterAuth', table: 'teamMember' },
  { component: 'betterAuth', table: 'member' },
  { component: 'betterAuth', table: 'invitation' },
  { component: 'betterAuth', table: 'team' },
  { component: 'betterAuth', table: 'organization' },
  { component: 'betterAuth', table: 'user' },
  { component: 'betterAuth', table: 'jwks' }
];
