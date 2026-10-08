// CPA uses [] for OpenAI-compatible upstreams that require no API key.
// Filter only truly empty editor placeholders; preserve auth-index-only
// entries and explicit per-row settings for backward compatibility.
export const hasOpenAIKeyEntryConfiguration = (entry: {
  apiKey?: string;
  authIndex?: string;
  weight?: number | string;
  proxyUrl?: string;
  headers?: Record<string, string>;
}): boolean =>
  Boolean(
    entry.apiKey?.trim() ||
      entry.authIndex?.trim() ||
      entry.proxyUrl?.trim() ||
      (entry.weight !== undefined && String(entry.weight).trim() !== '') ||
      Object.entries(entry.headers ?? {}).some(([key, value]) => key.trim() && value.trim())
  );
