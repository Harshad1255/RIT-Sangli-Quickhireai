const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const files = [path.join(root, 'server.js')];

function collect(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) collect(filename);
    else if (entry.isFile() && entry.name.endsWith('.js')) files.push(filename);
  }
}

collect(path.join(root, 'src'));
let failed = false;
for (const filename of files) {
  const result = spawnSync(process.execPath, ['--check', filename], { encoding: 'utf8' });
  if (result.error || result.status !== 0) {
    failed = true;
    console.error(result.error || result.stderr || `Syntax check failed: ${filename}`);
  }
}
if (failed) process.exit(1);
console.log(`Syntax checks passed for ${files.length} backend JavaScript files.`);
