import { readFile, writeFile } from 'node:fs/promises';

const filePath = process.argv[2] ?? 'apps/web/src/components/providers/ProviderTable/rowData.ts';
const source = await readFile(filePath, 'utf8');

if (/^(<<<<<<<|=======|>>>>>>>)/m.test(source)) {
  throw new Error(`Cannot restore provider display names while conflict markers remain in ${filePath}`);
}

const replacements = [
  {
    name: 'provider label',
    pattern: /label: config\.displayName\?\.trim\(\) \|\| maskApiKey\(config\.apiKey\),/g,
    current: 'label: config.displayName?.trim() || maskApiKey(config.apiKey),',
    legacy: 'label: maskApiKey(config.apiKey),',
    replacement: 'label: config.displayName?.trim() || maskApiKey(config.apiKey),',
  },
  {
    name: 'provider sort name',
    pattern: /sortName: config\.displayName\?\.trim\(\) \|\| getKeyConfigSortName\(config\),/g,
    current: 'sortName: config.displayName?.trim() || getKeyConfigSortName(config),',
    legacy: 'sortName: getKeyConfigSortName(config),',
    replacement: 'sortName: config.displayName?.trim() || getKeyConfigSortName(config),',
  },
  {
    name: 'provider search display name',
    pattern: /      config\.apiKey,\n      config\.displayName,\n      config\.prefix,/g,
    current: '      config.apiKey,\n      config.displayName,\n      config.prefix,',
    legacy: '      config.apiKey,\n      config.prefix,',
    replacement: '      config.apiKey,\n      config.displayName,\n      config.prefix,',
  },
];

let updated = source;
let changed = false;

for (const item of replacements) {
  const currentCount = [...updated.matchAll(item.pattern)].length;
  if (currentCount === 1) {
    continue;
  }
  if (currentCount > 1) {
    throw new Error(`Expected one ${item.name} implementation, found ${currentCount}`);
  }

  const legacyCount = item.legacy === item.replacement
    ? 0
    : updated.split(item.legacy).length - 1;
  if (legacyCount !== 1) {
    throw new Error(`Could not find a unique ${item.name} anchor in ${filePath}`);
  }
  updated = updated.replace(item.legacy, item.replacement);
  changed = true;
}

if (changed) {
  await writeFile(filePath, updated);
}

console.log(`${changed ? 'Restored' : 'Already present'} provider display-name behavior in ${filePath}`);
