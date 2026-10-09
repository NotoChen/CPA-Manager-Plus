import { describe, expect, it } from 'vitest';
import { getOpenAITestableKeyIndexes, hasOpenAIKeyEntryConfiguration } from './openAIKeyEntries';

describe('OpenAI-compatible keyless editor rows', () => {
  it('recognizes only a completely empty placeholder as unconfigured', () => {
    expect(hasOpenAIKeyEntryConfiguration({ apiKey: '' })).toBe(false);
    expect(hasOpenAIKeyEntryConfiguration({ apiKey: '', authIndex: 'cpa-index' })).toBe(true);
    expect(hasOpenAIKeyEntryConfiguration({ apiKey: '', proxyUrl: 'http://proxy:8080' })).toBe(true);
    expect(hasOpenAIKeyEntryConfiguration({ apiKey: '', weight: 0 })).toBe(true);
    expect(hasOpenAIKeyEntryConfiguration({ apiKey: '', headers: { 'X-Test': 'value' } })).toBe(true);
  });

  it('tests exactly one anonymous request when every editor row is blank', () => {
    expect(getOpenAITestableKeyIndexes([{ apiKey: '' }, { apiKey: '' }])).toEqual([0]);
    expect(getOpenAITestableKeyIndexes([])).toEqual([]);
  });

  it('skips empty trailing rows while retaining multiple configured keyless proxies', () => {
    expect(getOpenAITestableKeyIndexes([
      { apiKey: 'actual-key' },
      { apiKey: '' },
      { apiKey: '', proxyUrl: 'socks5://proxy:1080' },
      { apiKey: '', authIndex: 'keyless-index' },
    ])).toEqual([0, 2, 3]);
  });
});
