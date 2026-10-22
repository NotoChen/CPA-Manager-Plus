import { describe, expect, it } from 'vitest';
import { buildRealtimeSourceDisplay } from '@/features/monitoring/realtimeSourceDisplay';
import { sha256Hex } from '@/utils/apiKeyHash';
import { buildSourceInfoMap, resolveSourceDisplay } from '@/utils/sourceResolver';
import { buildCandidateUsageSourceIds } from '@/utils/usage';
import { buildEventRows } from './eventRows';
import { buildMonitoringSourceDisplay } from './sourceDisplay';
import type { MonitoringAuthMeta } from './types';

describe('personal compatibility contracts', () => {
  it.each([
    ['geminiApiKeys', 'gemini'],
    ['claudeApiKeys', 'claude'],
    ['codexApiKeys', 'codex'],
    ['xaiApiKeys', 'xai'],
    ['metaApiKeys', 'meta'],
    ['vertexApiKeys', 'vertex'],
  ] as const)('keeps configured names for %s across supported source IDs', (field, provider) => {
    const apiKey = 'sk-personal-contract-1234567890abcdef';
    const map = buildSourceInfoMap({
      [field]: [{ apiKey, displayName: '  My provider  ', authIndex: 'personal-auth' }],
    });
    for (const source of buildCandidateUsageSourceIds({ apiKey })) {
      const resolved = resolveSourceDisplay(source, '', map, new Map(), provider);
      expect(resolved.displayName).toBe('My provider');
      expect(resolved.type).toBe(provider);
    }
    expect(resolveSourceDisplay('', 'personal-auth', map, new Map()).displayName).toBe('My provider');
  });

  it('keeps hashed shared keys distinct in realtime and monitoring displays', () => {
    const apiKey = 'sk-shared-personal-contract-1234567890abcdef';
    const source = `h:${sha256Hex(apiKey)}`;
    const sourceInfoMap = buildSourceInfoMap({
      codexApiKeys: [{ apiKey, displayName: 'My Codex' }],
      claudeApiKeys: [{ apiKey, displayName: 'My Claude' }],
    });
    const t = ((key: string) => key) as Parameters<typeof buildRealtimeSourceDisplay>[1];
    for (const [provider, displayName] of [['codex', 'My Codex'], ['claude', 'My Claude']]) {
      const [row] = buildEventRows(
        [{
          timestamp: '2026-05-19T10:00:00Z',
          source,
          auth_index: null,
          auth_label_snapshot: provider,
          auth_provider_snapshot: provider,
          tokens: { input_tokens: 10, output_tokens: 20, total_tokens: 30 },
          failed: false,
          __modelName: 'test-model',
          __endpoint: 'POST /v1/responses',
          __timestampMs: Date.parse('2026-05-19T10:00:00Z'),
        }],
        new Map(), new Map(), sourceInfoMap, new Map(), {}, new Map()
      );
      expect(row.source).toBe(displayName);
      expect(row.sourceKey).toBe(`${provider}:0`);
      expect(buildRealtimeSourceDisplay(row, t).primary).toBe(displayName);
      expect(buildMonitoringSourceDisplay(
        { source, authLabelSnapshot: provider, authProviderSnapshot: provider },
        { authMetaMap: new Map(), channelByAuthIndex: new Map(), sourceInfoMap }
      ).primary).toBe(displayName);
    }
    expect(resolveSourceDisplay(source, '', sourceInfoMap, new Map()).displayName).toBe(source);
  });

  it('uses provider metadata when a historical event has no provider snapshot', () => {
    const apiKey = 'sk-metadata-personal-contract-1234567890abcdef';
    const sourceInfoMap = buildSourceInfoMap({
      codexApiKeys: [{ apiKey, displayName: 'Metadata Codex' }],
      claudeApiKeys: [{ apiKey, displayName: 'Metadata Claude' }],
    });
    const authMetaMap = new Map<string, MonitoringAuthMeta>([
      ['historical-auth', {
        authIndex: 'historical-auth', provider: 'codex', label: 'codex', account: '',
        status: 'ready', disabled: false, unavailable: false, runtimeOnly: false,
        planType: '', updatedAt: '',
      }],
    ]);
    const display = buildMonitoringSourceDisplay(
      { authIndex: 'historical-auth', source: `h:${sha256Hex(apiKey)}` },
      { authMetaMap, authFileMap: new Map(), channelByAuthIndex: new Map(), sourceInfoMap }
    );
    expect(display.primary).toBe('Metadata Codex');
  });
});
