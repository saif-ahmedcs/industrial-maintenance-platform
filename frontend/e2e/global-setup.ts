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

async function globalSetup(config: FullConfig): Promise<void> {
  rmSync(AUTH_STATE_DIR, { recursive: true, force: true });
  mkdirSync(AUTH_STATE_DIR, { recursive: true });

  const { baseURL } = config.projects[0]?.use ?? {};
  const browser = await chromium.launch();

  try {
    for (let slot = 0; slot < ADMIN_POOL_SIZE; slot++) {
      const admin = await browser.newContext({ baseURL });
      await loginAs(await admin.newPage(), ADMIN_EMAIL, ADMIN_PASSWORD);
      await admin.storageState({ path: adminSlotStatePath(slot) });
      await admin.close();
    }

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
