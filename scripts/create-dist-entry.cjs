const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const mainJs = path.join(distDir, 'main.js');
const mainNoExt = path.join(distDir, 'main');

if (!fs.existsSync(distDir) || !fs.existsSync(mainJs)) {
  process.exit(0);
}

try {
  fs.writeFileSync(
    mainNoExt,
    "#!/usr/bin/env node\nrequire('./main.js');\n",
    { encoding: 'utf8' },
  );
} catch (error) {
  process.stderr.write(`Failed to create dist/main entry: ${error?.message || error}\n`);
  process.exit(1);
}
