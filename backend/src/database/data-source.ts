import { config } from 'dotenv';
import { DataSource } from 'typeorm';

const envFiles =
  process.env.NODE_ENV === 'test' ? ['../.env.test', '../.env'] : ['../.env'];
for (const file of envFiles) {
  config({ path: file });
}

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT ?? '5432', 10),
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  synchronize: false,
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
});

export default AppDataSource;
