import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, '..', 'src');

const HEX_PATTERN = /#[0-9a-fA-F]{3,8}\b/g;

const TARGETS = [
  { dir: path.join(SRC, 'features'), extensions: null },
  { dir: path.join(SRC, 'design'), extensions: ['.tsx'] },
];

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
        const matches = line.match(HEX_PATTERN);
        if (matches) {
          violations.push(
            `  ${path.relative(path.join(__dirname, '..'), file)}:${index + 1}  ${matches.join(', ')}`,
          );
        }
      });
    }
  }

  if (violations.length > 0) {
    console.error(
      'Hex color literal(s) found outside src/design/theme.css. Use a design token (a Tailwind utility or CSS variable) instead:\n' +
        violations.join('\n'),
    );
    process.exit(1);
  }

  console.log(
    'No hex color literals found in src/features/** or src/design/**/*.tsx.',
  );
}

main();
