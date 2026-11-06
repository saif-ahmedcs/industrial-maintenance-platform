import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const AUTH_STATE_DIR = resolve(__dirname, '.auth');

export const ADMIN_POOL_SIZE = 24;

export function adminSlotStatePath(slot: number): string {
  return resolve(AUTH_STATE_DIR, `admin-${slot}.json`);
}

const ADMIN_CLAIMS_DIR = resolve(AUTH_STATE_DIR, 'admin-claims');

export function claimAdminSlot(): string {
  mkdirSync(ADMIN_CLAIMS_DIR, { recursive: true });
  for (let slot = 0; slot < ADMIN_POOL_SIZE; slot++) {
    try {
      mkdirSync(resolve(ADMIN_CLAIMS_DIR, String(slot)));
      return adminSlotStatePath(slot);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
    }
  }
  throw new Error(
    `All ${ADMIN_POOL_SIZE} admin session slots are claimed. Raise ` +
      'ADMIN_POOL_SIZE in e2e/storage-state.ts (and the matching mint ' +
      'loop in e2e/global-setup.ts) if this suite now has more ' +
      'admin-role test instances, or more CI retries, than that covers.',
  );
}

export const STORAGE_STATE = {
  supervisor: resolve(AUTH_STATE_DIR, 'supervisor.json'),
  technician: resolve(AUTH_STATE_DIR, 'technician.json'),
  viewer: resolve(AUTH_STATE_DIR, 'viewer.json'),
} as const;
