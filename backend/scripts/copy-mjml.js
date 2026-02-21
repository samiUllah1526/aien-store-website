const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src', 'modules', 'mail', 'templates');
const destDir = path.join(__dirname, '..', 'dist', 'src', 'modules', 'mail', 'templates');

if (!fs.existsSync(srcDir)) return;
fs.mkdirSync(destDir, { recursive: true });
fs.readdirSync(srcDir)
  .filter((f) => f.endsWith('.mjml'))
  .forEach((f) => fs.copyFileSync(path.join(srcDir, f), path.join(destDir, f)));
