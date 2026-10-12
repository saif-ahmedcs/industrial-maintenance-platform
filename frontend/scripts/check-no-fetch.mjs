import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, '..', 'src');

const FETCH_PATTERN = /\bfetch\s*\(/g;

const TARGETS = [{ dir: path.join(SRC, 'features'), extensions: null }];

function walk(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walk(full));
    } else {
      out.push(full);
    }
  }
  return out;
}

function main() {
  const violations = [];

  for (const target of TARGETS) {
    const files = walk(target.dir).filter(
      (file) =>
        !target.extensions || target.extensions.includes(path.extname(file)),
    );
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      const lines = text.split('\n');
      lines.forEach((line, index) => {
        const matches = line.match(FETCH_PATTERN);
        if (matches) {
          violations.push(
            `  ${path.relative(path.join(__dirname, '..'), file)}:${index + 1}  ${line.trim()}`,
          );
        }
      });
    }
  }

  if (violations.length > 0) {
    console.error(
      'Direct fetch() call(s) found in src/features/**. Go through src/lib/api/client.ts (the ' +
        'request() helper) instead, so auth, refresh-on-401, and error normalization stay ' +
        'consistent:\n' +
        violations.join('\n'),
    );
    process.exit(1);
  }

  console.log('No direct fetch() calls found in src/features/**.');
}

main();
