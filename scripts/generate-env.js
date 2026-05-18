const fs = require('fs');
const path = require('path');

const LOCAL = process.argv.includes('--local');
const root = path.resolve(__dirname, '..');

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(filePath, 'utf8')
      .split('\n')
      .filter((line) => line.trim() && !line.startsWith('#'))
      .map((line) => {
        const i = line.indexOf('=');
        return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
      }),
  );
}

const base = parseEnvFile(path.join(root, '.env'));
const local = LOCAL ? parseEnvFile(path.join(root, '.env.local')) : {};
const vars = { ...base, ...local };

const content = `export const environment = {
  nordpoolApiUrl: '${vars['NORDPOOL_API_URL'] ?? ''}',
};
`;

const outFile = path.join(
  root,
  'src/environments',
  LOCAL ? 'environment.local.ts' : 'environment.ts',
);

fs.writeFileSync(outFile, content);
console.log(`Generated ${path.relative(root, outFile)}`);
