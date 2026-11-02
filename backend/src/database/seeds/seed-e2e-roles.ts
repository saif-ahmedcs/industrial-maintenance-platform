import * as bcrypt from 'bcrypt';
import AppDataSource from '../data-source';
import { Role, RoleName } from '../../users/entities/role.entity';
import { User } from '../../users/entities/user.entity';

const BCRYPT_SALT_ROUNDS = 10;

/**
 * Fixed, test-only credentials for roles.spec.ts (frontend/e2e). There is
 * currently no seed script or API endpoint that can create a SUPERVISOR or
 * TECHNICIAN user any other way (POST /auth/register always assigns
 * VIEWER — see auth.service.ts — and seed-admin.ts only ever creates one
 * ADMIN). This is additive only: it doesn't touch seed-admin.ts,
 * seed-demo-data.ts, or any existing endpoint.
 *
 * `.test` is a reserved TLD (RFC 2606) precisely so these read as
 * non-production fixtures, not real addresses.
 */
export const E2E_ROLE_USERS = [
  {
    role: RoleName.SUPERVISOR,
    email: 'supervisor.e2e@example.test',
    password: 'E2eTestPass123!',
  },
  {
    role: RoleName.TECHNICIAN,
    email: 'technician.e2e@example.test',
    password: 'E2eTestPass123!',
  },
] as const;

async function seed(): Promise<void> {
  await AppDataSource.initialize();

  const roleRepo = AppDataSource.getRepository(Role);
  const userRepo = AppDataSource.getRepository(User);

  for (const { role, email, password } of E2E_ROLE_USERS) {
    const roleEntity = await roleRepo.findOne({ where: { name: role } });
    if (!roleEntity) {
      throw new Error(
        `${role} role not found — run migrations first (roles are seeded by a migration, not this script)`,
      );
    }

    const existing = await userRepo.findOne({ where: { email } });
    if (!existing) {
      const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
      const user = userRepo.create({
        email,
        passwordHash,
        isActive: true,
        roles: [roleEntity],
      });
      await userRepo.save(user);
      console.log(`Created ${role} e2e user: ${email}`);
    } else {
      console.log(`${role} e2e user already exists: ${email}`);
    }
  }

  await AppDataSource.destroy();
}

seed()
  .then(() => {
    console.log('Seed complete.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
