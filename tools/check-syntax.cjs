const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
let count = 0;
for (const match of fs.readFileSync(path.join(root, 'reel.html'), 'utf8').matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
  const type = /type=["']([^"']+)["']/i.exec(match[1])?.[1];
  if (/src=/i.test(match[1]) || (type && !['text/javascript', 'application/javascript', 'module'].includes(type)) || !match[2].trim()) continue;
  new vm.Script(match[2], { filename: `reel.html:inline-${++count}` });
}
for (const file of ['assets/recommendations-core.js', 'assets/recommendations.js', 'api/recommend.js']) {
  new vm.Script(fs.readFileSync(path.join(root, file), 'utf8'), { filename: file }); count++;
}
console.log(`PASS: ${count} JavaScript scripts parse successfully. Static HTML has no compilation step.`);
