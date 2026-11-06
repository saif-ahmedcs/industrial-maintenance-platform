import { mkdirSync, rmSync } from 'node:fs';
import { chromium, type FullConfig } from '@playwright/test';
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  SUPERVISOR_EMAIL,
  SUPERVISOR_PASSWORD,
  TECHNICIAN_EMAIL,
  TECHNICIAN_PASSWORD,
  VIEWER_EMAIL,
  VIEWER_PASSWORD,
} from './env';
import { loginAs } from './fixtures';
import {
  ADMIN_POOL_SIZE,
  adminSlotStatePath,
  AUTH_STATE_DIR,
  STORAGE_STATE,
} from './storage-state';

/**
 * Logs in once per role and saves each session to disk, so specs that only
 * need to BE a given role (everything except auth.spec.ts, which tests the
 * login form itself) load a cached session via the `adminPage` /
 * `supervisorPage` / `technicianPage` / `viewerPage` fixtures in
 * `fixtures.ts` instead of calling `POST /auth/login` again.
 *
 * `/auth/login` is throttled per IP (see `AUTH_LOGIN_RATE_LIMIT` in
 * `backend/src/auth/auth-rate-limit.ts`), and every Playwright run shares
 * one IP (localhost) — with 13+ specs each logging in fresh, the suite
 * used to exhaust that limit well before a full run finished. This keeps
 * real logins down to these 4, plus the ones in auth.spec.ts that must
 * exercise the real form.
 *
 * The ADMIN role is also the one role more than one test needs a cached
 * session for (see the big comment in `storage-state.ts`), and
 * `/auth/refresh` is single-use, so a single shared `admin.json` would
 * work for exactly one of those tests and silently lock the rest out of
 * their role-gated UI. Instead of one admin session, this mints an
 * `ADMIN_POOL_SIZE`-sized pool of never-reused ones: starting from the
 * one real login, it rotates the refresh token sequentially — each
 * `/auth/refresh` call both invalidates the previous value and is the
 * only place the next one appears — and saves every rotation to its own
 * numbered slot file before moving to the next. `claimAdminSlot()` hands
 * each admin-role test one of those slots. That loop is as many
 * `/auth/refresh` calls as `ADMIN_POOL_SIZE`, so it also needs
 * `AUTH_REFRESH_RATE_LIMIT` raised for this run (see
 * `playwright.config.ts`'s `webServer.env`) — at the production default
 * of 10/minute this loop alone would trip the limit before finishing.
 */
async function globalSetup(config: FullConfig): Promise<void> {
  // Start clean: claim markers are directories left on disk by
  // claimAdminSlot() in a previous run, and would otherwise make this
  // run think slots are already taken.
  rmSync(AUTH_STATE_DIR, { recursive: true, force: true });
  mkdirSync(AUTH_STATE_DIR, { recursive: true });

  const { baseURL } = config.projects[0]?.use ?? {};
  const browser = await chromium.launch();

  try {
    const admin = await browser.newContext({ baseURL });
    await loginAs(await admin.newPage(), ADMIN_EMAIL, ADMIN_PASSWORD);
    for (let slot = 0; slot < ADMIN_POOL_SIZE; slot++) {
      const rotated = await admin.request.post('/auth/refresh');
      if (!rotated.ok()) {
        throw new Error(
          `Failed to mint admin session slot ${slot}/${ADMIN_POOL_SIZE}: ` +
            `${rotated.status()} ${await rotated.text()}. If this is a ` +
            '429, raise AUTH_REFRESH_RATE_LIMIT for this run (see ' +
            "playwright.config.ts's webServer.env).",
        );
      }
      await admin.storageState({ path: adminSlotStatePath(slot) });
    }
    await admin.close();

    const supervisor = await browser.newContext({ baseURL });
    await loginAs(
      await supervisor.newPage(),
      SUPERVISOR_EMAIL,
      SUPERVISOR_PASSWORD,
    );
    await supervisor.storageState({ path: STORAGE_STATE.supervisor });
    await supervisor.close();

    const technician = await browser.newContext({ baseURL });
    await loginAs(
      await technician.newPage(),
      TECHNICIAN_EMAIL,
      TECHNICIAN_PASSWORD,
    );
    await technician.storageState({ path: STORAGE_STATE.technician });
    await technician.close();

    const viewer = await browser.newContext({ baseURL });
    const viewerPage = await viewer.newPage();
    // POST /auth/register always assigns VIEWER (auth.service.ts) and has
    // no upsert semantics; a non-ok response here just means this fixed
    // account already exists from a previous run, which is fine — proceed
    // to log in either way.
    await viewerPage.request.post('/auth/register', {
      data: { email: VIEWER_EMAIL, password: VIEWER_PASSWORD },
    });
    await loginAs(viewerPage, VIEWER_EMAIL, VIEWER_PASSWORD);
    await viewer.storageState({ path: STORAGE_STATE.viewer });
    await viewer.close();
  } finally {
    await browser.close();
  }
}

export default globalSetup;
