import * as bcrypt from 'bcrypt';
import AppDataSource from '../data-source';
import { Role, RoleName } from '../../users/entities/role.entity';
import { User } from '../../users/entities/user.entity';

const BCRYPT_SALT_ROUNDS = 10;

async function seed(): Promise<void> {
  await AppDataSource.initialize();

  const roleRepo = AppDataSource.getRepository(Role);
  const userRepo = AppDataSource.getRepository(User);

  const roles: Record<RoleName, Role> = {} as Record<RoleName, Role>;

  for (const name of Object.values(RoleName)) {
    let role = await roleRepo.findOne({ where: { name } });
    if (!role) {
      role = await roleRepo.save(roleRepo.create({ name }));
      console.log(`Created role: ${name}`);
    } else {
      console.log(`Role already exists: ${name}`);
    }
    roles[name] = role;
  }

  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL ?? 'admin@example.com';
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD ?? 'ChangeMe123!';

  const existingAdmin = await userRepo.findOne({
    where: { email: adminEmail },
  });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, BCRYPT_SALT_ROUNDS);
    const admin = userRepo.create({
      email: adminEmail,
      passwordHash,
      isActive: true,
      roles: [roles[RoleName.ADMIN]],
    });
    await userRepo.save(admin);
    console.log(`Created default admin: ${adminEmail}`);
  } else {
    console.log(`Admin already exists: ${adminEmail}`);
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
