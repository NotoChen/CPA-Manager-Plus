import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mocks } = vi.hoisted(() => ({
  mocks: {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('./client', () => ({
  apiClient: {
    get: mocks.get,
    put: mocks.put,
    delete: mocks.delete,
  },
}));

import { providersApi } from './providers';

beforeEach(() => {
  mocks.get.mockReset();
  mocks.put.mockReset();
  mocks.delete.mockReset();
});

describe('provider display names', () => {
  it('loads and saves display names for Codex and Gemini provider entries', async () => {
    mocks.get.mockResolvedValueOnce({
      'codex-api-key': [
        {
          'api-key': 'codex-key',
          'display-name': 'Work Codex',
          'base-url': 'https://codex.example/v1',
        },
      ],
    });

    await expect(providersApi.getCodexConfigs()).resolves.toEqual([
      expect.objectContaining({
        apiKey: 'codex-key',
        displayName: 'Work Codex',
        baseUrl: 'https://codex.example/v1',
      }),
    ]);

    mocks.get.mockResolvedValueOnce({ 'codex-api-key': [] });
    mocks.put.mockResolvedValueOnce({});
    await providersApi.saveCodexConfigs([
      {
        apiKey: 'codex-key',
        displayName: 'Work Codex',
        baseUrl: 'https://codex.example/v1',
      },
    ]);
    expect(mocks.put).toHaveBeenLastCalledWith('/codex-api-key', [
      {
        'api-key': 'codex-key',
        'display-name': 'Work Codex',
        'base-url': 'https://codex.example/v1',
      },
    ]);

    mocks.get.mockResolvedValueOnce({
      'gemini-api-key': [{ 'api-key': 'gemini-key', 'display-name': 'Work Gemini' }],
    });
    await expect(providersApi.getGeminiKeys()).resolves.toEqual([
      expect.objectContaining({ apiKey: 'gemini-key', displayName: 'Work Gemini' }),
    ]);

    mocks.get.mockResolvedValueOnce({ 'gemini-api-key': [] });
    mocks.put.mockResolvedValueOnce({});
    await providersApi.saveGeminiKeys([
      { apiKey: 'gemini-key', displayName: 'Work Gemini' },
    ]);
    expect(mocks.put).toHaveBeenLastCalledWith('/gemini-api-key', [
      { 'api-key': 'gemini-key', 'display-name': 'Work Gemini' },
    ]);
  });
});
