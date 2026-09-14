import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { testIds } from '@/lib/test-ids';
import { AiSettings } from './ai-settings';

const ai = vi.hoisted(() => ({
  canManage: true,
  canSave: false,
  configured: false,
  draft: {
    apiKey: '',
    baseUrl: null as string | null,
    error: null as string | null,
    isPending: false,
    message: null as string | null
  },
  fromEnvironment: false,
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
  remove: vi.fn(),
  save: vi.fn(),
  selectProvider: vi.fn(),
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
  ai.canManage = true;
  ai.configured = false;
  ai.fromEnvironment = false;
});

describe('AiSettings', () => {
  test('explains that group keys are a fallback when env is unset', () => {
    render(<AiSettings />);
    expect(screen.getByText(/Saved keys are protected/i)).toBeTruthy();
    expect(screen.queryByTestId(testIds.settingsAiEnvironmentNotice)).toBeNull();
  });

  test('shows an environment notice when Convex env supplies credentials', () => {
    ai.fromEnvironment = true;
    render(<AiSettings />);
    expect(screen.getByTestId(testIds.settingsAiEnvironmentNotice).textContent).toMatch(
      /Already connected/i
    );
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
