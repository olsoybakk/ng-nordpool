const fs = require('fs');
const path = require('path');

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
const local = parseEnvFile(path.join(root, '.env.local'));
const vars = { ...base, ...local, ...process.env };

const outFile = path.join(root, 'src/environments/environment.ts');

fs.writeFileSync(
  outFile,
  `export const environment = {
  nordpoolApiUrl: '${vars['NORDPOOL_API_URL'] ?? ''}',
};
`,
);

console.log(`Generated ${path.relative(root, outFile)}`);
