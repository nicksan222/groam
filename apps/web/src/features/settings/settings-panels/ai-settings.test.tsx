import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { testIds } from '@/lib/test-ids';
import { AiSettings } from './ai-settings';

const ai = vi.hoisted(() => ({
  canManageOrganization: true,
  canSave: false,
  configured: false,
  draft: {
    apiKey: '',
    baseUrl: null as string | null,
    error: null as string | null,
    isPending: false,
    message: null as string | null
  },
  effectiveModel: null as string | null,
  effectiveProvider: null as 'openai' | null,
  effectiveSource: 'unconfigured' as 'deployment' | 'organization' | 'personal' | 'unconfigured',
  environmentConfigured: false,
  organizationConfigured: false,
  isLoading: false,
  baseUrl: '',
  model: '',
  preset: {
    baseURL: undefined as string | undefined,
    defaultModel: undefined as string | undefined,
    hint: 'Uses OpenAI’s official API.',
    keyPlaceholder: 'sk-…',
    requiresBaseUrl: undefined as boolean | undefined,
    webSearch: undefined as boolean | undefined
  },
  provider: 'openai' as const,
  providerConnection: null as null | { connect: () => Promise<void>; label: string },
  remove: vi.fn(),
  save: vi.fn(),
  selectProvider: vi.fn(),
  setTarget: vi.fn(),
  target: 'personal' as 'organization' | 'personal',
  updateDraft: vi.fn()
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: { children: import('react').ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  )
}));
vi.mock('@/features/settings/hooks/use-ai-settings', () => ({
  useAiSettings: () => ai
}));

afterEach(() => {
  cleanup();
  ai.canManageOrganization = true;
  ai.configured = false;
  ai.environmentConfigured = false;
  ai.organizationConfigured = false;
  ai.effectiveModel = null;
  ai.effectiveProvider = null;
  ai.effectiveSource = 'unconfigured';
  ai.baseUrl = '';
  ai.provider = 'openai';
  ai.providerConnection = null;
  ai.target = 'personal';
  ai.preset = {
    baseURL: undefined,
    defaultModel: undefined,
    hint: 'Uses OpenAI’s official API.',
    keyPlaceholder: 'sk-…',
    requiresBaseUrl: undefined,
    webSearch: undefined
  };
});

describe('AiSettings', () => {
  test('explains that saved keys are personal and take priority', () => {
    render(<AiSettings />);
    expect(screen.getByText(/personal key follows your account/i)).toBeTruthy();
    expect(screen.queryByTestId(testIds.settingsAiEnvironmentNotice)).toBeNull();
  });

  test('shows an organization notice when a shared key is available', () => {
    ai.organizationConfigured = true;
    ai.effectiveProvider = 'openai';
    ai.effectiveSource = 'organization';
    render(<AiSettings />);
    expect(screen.getByTestId(testIds.settingsAiEnvironmentNotice).textContent).toMatch(
      /Organization connection available/i
    );
  });

  test('clearly labels the shared organization connection', () => {
    ai.configured = true;
    ai.target = 'organization';
    render(<AiSettings />);
    expect(screen.getByText('Organization connection')).toBeTruthy();
    expect(screen.getByText('Organization AI provider')).toBeTruthy();
    expect(screen.getByText(/shared organization connection is ready/i)).toBeTruthy();
  });

  test('offers one-click OpenRouter connection when OpenRouter is selected', () => {
    ai.provider = 'openrouter' as typeof ai.provider;
    ai.providerConnection = { connect: vi.fn(), label: 'Connect OpenRouter' };
    render(<AiSettings />);
    expect(screen.getByTestId(testIds.settingsAiConnectProvider)).toBeTruthy();
  });

  test('asks for a base URL and hides web search for local hosts', () => {
    ai.preset = {
      ...ai.preset,
      baseURL: 'http://127.0.0.1:11434/v1',
      hint: 'Ollama, LM Studio, vLLM, or any OpenAI-compatible /v1 host. Web search is off.',
      keyPlaceholder: 'ollama',
      requiresBaseUrl: true,
      webSearch: false
    };
    ai.provider = 'compatible' as typeof ai.provider;
    ai.baseUrl = 'http://127.0.0.1:11434/v1';
    render(<AiSettings />);
    expect(screen.getByTestId(testIds.settingsAiBaseUrl)).toBeTruthy();
    expect(screen.getByText(/Web search is off for this host/i)).toBeTruthy();
  });
});
