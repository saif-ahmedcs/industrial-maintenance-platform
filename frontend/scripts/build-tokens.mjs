import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_ROOT = path.join(__dirname, '..');
const TOKENS_PATH = path.join(FRONTEND_ROOT, 'design', 'tokens.json');
const OUTPUT_PATH = path.join(FRONTEND_ROOT, 'src', 'design', 'theme.css');
const PRINT_WIDTH = 80; // matches .prettierrc's default printWidth

function loadTokens() {
  const raw = readFileSync(TOKENS_PATH, 'utf8');
  return JSON.parse(raw);
}

function resolveRef(ref, root) {
  const match = /^\{([\w.-]+)\}$/.exec(ref);
  if (!match) return ref;

  const segments = match[1].split('.');
  let node = root;
  for (const segment of segments) {
    if (node == null || typeof node !== 'object' || !(segment in node)) {
      throw new Error(`Unresolvable token reference: {${match[1]}}`);
    }
    node = node[segment];
  }
  if (node && typeof node === 'object' && '$value' in node) {
    return node.$value;
  }
  throw new Error(`Token reference {${match[1]}} does not resolve to a value`);
}

function formatFontFamily(stack) {
  return stack.map((name, i) => (i === 0 ? `"${name}"` : name)).join(', ');
}

function splitTopLevelArgs(argsSource) {
  const args = [];
  let depth = 0;
  let current = '';
  for (const char of argsSource) {
    if (char === '(') depth += 1;
    if (char === ')') depth -= 1;
    if (char === ',' && depth === 0) {
      args.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) args.push(current.trim());
  return args;
}

function formatDeclaration(name, value) {
  const oneLine = `  --${name}: ${value};`;
  if (oneLine.length <= PRINT_WIDTH) return oneLine;

  const call = /^([\w-]+)\((.*)\)$/s.exec(value);
  if (!call) return oneLine; // not a function call; nothing we know how to wrap

  const [, fnName, argsSource] = call;
  const args = splitTopLevelArgs(argsSource);
  const argLines = args.map(
    (arg, i) => `    ${arg}${i < args.length - 1 ? ',' : ''}`,
  );
  return [`  --${name}: ${fnName}(`, ...argLines, `  );`].join('\n');
}

function buildThemeCss(tokens) {
  const chunks = [];

  const colorGroups = [
    {
      key: 'surface',
      comment: 'Surfaces: bg-surface-abyss, bg-surface-kelp ...',
    },
    { key: 'text', comment: 'Text: text-text-platinum ...' },
    { key: 'accent', comment: 'Accent' },
    {
      key: 'alarm',
      comment: 'Alarm: added per decisions.md #4, CRITICAL/WARNING only',
    },
    { key: 'focus', comment: 'Focus' },
  ];
  for (const group of colorGroups) {
    const lines = [`  /* ${group.comment} */`];
    for (const [key, token] of Object.entries(tokens.color[group.key])) {
      lines.push(`  --color-${group.key}-${key}: ${token.$value};`);
    }
    chunks.push(lines.join('\n'));
  }

  {
    const lines = [
      '  /* Gradients: bg-gradient-bioluminescent, bg-gradient-aurora */',
    ];
    for (const [key, token] of Object.entries(tokens.color.gradient)) {
      lines.push(
        formatDeclaration(`background-image-gradient-${key}`, token.$value),
      );
    }
    chunks.push(lines.join('\n'));
  }

  {
    const lines = ['  /* Font families */'];
    for (const [key, token] of Object.entries(tokens.fontFamily)) {
      lines.push(`  --font-${key}: ${formatFontFamily(token.$value)};`);
    }
    chunks.push(lines.join('\n'));
  }

  {
    chunks.push(
      [
        '  /* Spacing: base 4px, so p-4 = 16px */',
        `  --spacing: ${tokens.spacing.unit.$value};`,
      ].join('\n'),
    );
  }

  {
    const entries = Object.entries(tokens.typography);
    entries.forEach(([key, token], index) => {
      resolveRef(token.$value.fontFamily, tokens);

      const lines = [];
      if (index === 0) {
        lines.push(
          '  /* Type scale: size, line-height, tracking travel together */',
        );
      }
      lines.push(`  --text-${key}: ${token.$value.fontSize};`);
      lines.push(`  --text-${key}--line-height: ${token.$value.lineHeight};`);
      if (token.$value.letterSpacing !== '0em') {
        lines.push(
          `  --text-${key}--letter-spacing: ${token.$value.letterSpacing};`,
        );
      }
      chunks.push(lines.join('\n'));
    });
  }

  {
    const lines = ['  /* Radius: the only two shape values in the system */'];
    for (const [key, token] of Object.entries(tokens.radius)) {
      lines.push(`  --radius-${key}: ${token.$value};`);
    }
    chunks.push(lines.join('\n'));
  }

  {
    const lines = [
      '  /* Layout */',
      `  --container-page: ${tokens.layout['page-max-width'].$value};`,
      `  --container-prose: ${tokens.layout['prose-max-width'].$value};`,
    ];
    chunks.push(lines.join('\n'));
  }

  return (
    [
      '/* Generated from design/tokens.json. Do not edit. */',
      '',
      '@theme {',
      chunks.join('\n\n'),
      '}',
    ].join('\n') + '\n'
  );
}

function main() {
  const tokens = loadTokens();
  const css = buildThemeCss(tokens);
  const checkOnly = process.argv.includes('--check');

  if (checkOnly) {
    const existing = existsSync(OUTPUT_PATH)
      ? readFileSync(OUTPUT_PATH, 'utf8')
      : null;
    if (existing === css) {
      console.log('src/design/theme.css is up to date.');
      return;
    }
    console.error(
      'src/design/theme.css is out of date with design/tokens.json.\n' +
        'Run `npm run tokens` to regenerate it.',
    );
    process.exit(1);
  }

  writeFileSync(OUTPUT_PATH, css, 'utf8');
  console.log(`Wrote ${path.relative(FRONTEND_ROOT, OUTPUT_PATH)}`);
}

main();
