import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadRootEnv(): Record<string, string> {
  const path = resolve(__dirname, '../../.env');
  let text: string;
  try {
    text = readFileSync(path, 'utf-8');
  } catch {
    return {};
  }

  const out: Record<string, string> = {};
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    out[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
  return out;
}

const rootEnv = loadRootEnv();

function required(
  name: 'DEFAULT_ADMIN_EMAIL' | 'DEFAULT_ADMIN_PASSWORD',
): string {
  const value = process.env[name] ?? rootEnv[name];
  if (!value) {
    throw new Error(
      `${name} is not set. The e2e suite signs in as the seeded admin, so ` +
        `it needs the same ${name} value the backend was seeded with ` +
        '(repo root .env, or export it in the shell running Playwright).',
    );
  }
  return value;
}

export const ADMIN_EMAIL = required('DEFAULT_ADMIN_EMAIL');
export const ADMIN_PASSWORD = required('DEFAULT_ADMIN_PASSWORD');
export const SUPERVISOR_EMAIL = 'supervisor.e2e@example.test';
export const SUPERVISOR_PASSWORD = 'E2eTestPass123!';
export const TECHNICIAN_EMAIL = 'technician.e2e@example.test';
export const TECHNICIAN_PASSWORD = 'E2eTestPass123!';
