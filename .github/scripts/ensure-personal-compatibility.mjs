import { execFileSync } from 'node:child_process';
import { copyFile, readFile, writeFile } from 'node:fs/promises';

const contractTemplate = process.argv[2];
if (!contractTemplate) throw new Error('A personal compatibility contract template is required');

function replaceOnce(source, before, after, label) {
  if (source.includes(after)) return source;
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`Expected one ${label} anchor, found ${count}`);
  return source.replace(before, after);
}

const resolverPath = 'apps/web/src/utils/sourceResolver.ts';
let resolver = await readFile(resolverPath, 'utf8');
if (/^(<<<<<<<|=======|>>>>>>>)/m.test(resolver)) {
  throw new Error(`Unresolved conflicts in ${resolverPath}`);
}
resolver = replaceOnce(
  resolver,
  'items: Array<{ prefix?: string; name?: string; baseUrl?: string }>,',
  'items: Array<{ prefix?: string; name?: string; baseUrl?: string; displayName?: string }>,',
  'configured provider display-name type'
);
resolver = replaceOnce(
  resolver,
  '  return items.map((item, index) => {\n    const prefix = item.prefix?.trim();',
  '  return items.map((item, index) => {\n    const displayName = item.displayName?.trim();\n    if (displayName) return displayName;\n\n    const prefix = item.prefix?.trim();',
  'configured provider display-name priority'
);
resolver = replaceOnce(
  resolver,
  '    items: Array<{\n      apiKey?: string;\n      prefix?: string;',
  '    items: Array<{\n      apiKey?: string;\n      displayName?: string;\n      prefix?: string;',
  'static provider display-name field'
);
resolver = replaceOnce(
  resolver,
  'const buildProviderSourceKey = (provider: string, source: string) =>\n  JSON.stringify([provider, source]);',
  `const normalizeProviderType = (value: unknown) => {
  const normalized = String(value ?? '').trim().toLowerCase().replace(/_/g, '-');
  if (normalized === 'openai-compatibility') return 'openai';
  if (normalized === 'x-ai' || normalized === 'grok') return 'xai';
  if (normalized === 'gemini-cli') return 'gemini';
  return normalized;
};

const buildProviderSourceKey = (provider: string, source: string) =>
  JSON.stringify([normalizeProviderType(provider), source]);`,
  'provider source aliases'
);
resolver = replaceOnce(
  resolver,
  "    const provider = typeof providerRaw === 'string' ? providerRaw.trim().toLowerCase() : '';",
  '    const provider = normalizeProviderType(providerRaw);',
  'event provider alias normalization'
);
resolver = replaceOnce(
  resolver,
  `export function resolveSourceIdentityKey(
  sourceRaw: string,
  authIndex: unknown,
  sourceInfoMap: SourceInfoMap,
  authFileMap: Map<string, CredentialInfo>
): string {
  return resolveSourceDisplay(sourceRaw, authIndex, sourceInfoMap, authFileMap).identityKey || '';
}`,
  `export function resolveSourceIdentityKey(
  sourceRaw: string,
  authIndex: unknown,
  sourceInfoMap: SourceInfoMap,
  authFileMap: Map<string, CredentialInfo>,
  providerRaw: unknown = ''
): string {
  return resolveSourceDisplay(sourceRaw, authIndex, sourceInfoMap, authFileMap, providerRaw).identityKey || '';
}`,
  'provider-aware source identity'
);
await writeFile(resolverPath, resolver);

const displayPath = 'apps/web/src/features/monitoring/model/sourceDisplay.ts';
let display = await readFile(displayPath, 'utf8');
if (/^(<<<<<<<|=======|>>>>>>>)/m.test(display)) {
  throw new Error(`Unresolved conflicts in ${displayPath}`);
}
display = replaceOnce(
  display,
  '    snapshotProvider\n  );\n  const apiKeyHash',
  '    authMeta?.provider || snapshotProvider\n  );\n  const apiKeyHash',
  'monitoring provider metadata fallback'
);
await writeFile(displayPath, display);

execFileSync(process.execPath, ['bin/release/restore-provider-display-name.mjs'], {
  stdio: 'inherit',
});
await copyFile(
  contractTemplate,
  'apps/web/src/features/monitoring/model/personalCompatibility.test.ts'
);
console.log('Restored personal behavior over upstream source and installed isolated contracts');
