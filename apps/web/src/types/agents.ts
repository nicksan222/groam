import type { api } from '@groam/backend/api';
import type { FunctionReturnType } from 'convex/server';

export type WorkspaceAgentRun = FunctionReturnType<
  typeof api.routes.agents.runs.workspace.run
>['page'][number];

export type AgentRun = FunctionReturnType<typeof api.routes.agents.runs.list.run>['page'][number];

export type AgentRunTableRun = AgentRun | WorkspaceAgentRun;

export type AgentRunEvent = FunctionReturnType<
  typeof api.routes.agents.runs.events.run
>['page'][number];

export type AgentDetailAgent = FunctionReturnType<typeof api.routes.agents.get.run>;

export type AgentRunReportTone = 'applied' | 'attempted' | 'neutral';

export type AgentRunReportSegment =
  | { type: 'emphasis'; value: string }
  | { type: 'id'; value: string }
  | { type: 'money'; value: string }
  | { type: 'text'; value: string };

export type AgentRunReportField = {
  ids: string[];
  label: string;
  raw: string;
};

export type AgentRunReportItem = {
  fields: AgentRunReportField[];
  segments: AgentRunReportSegment[];
};

export type AgentRunReportSection = {
  items: AgentRunReportItem[];
  title: string;
  tone: AgentRunReportTone;
};

export type ParsedAgentRunReport = {
  lead: AgentRunReportItem[];
  sections: AgentRunReportSection[];
};
