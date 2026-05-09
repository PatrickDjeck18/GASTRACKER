const { execSync } = require('child_process');
const fs = require('fs');

try {
  const output = execSync('npx firebase functions:log --lines 30', { encoding: 'utf8' });
  fs.writeFileSync('output-logs.txt', output, 'utf8');
} catch (e) {
  fs.writeFileSync('output-logs.txt', e.stdout || e.message, 'utf8');
}
