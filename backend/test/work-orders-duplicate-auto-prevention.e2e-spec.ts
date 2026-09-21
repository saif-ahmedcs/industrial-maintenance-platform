import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';
import { RoleName } from './../src/users/entities/role.entity';
import {
  WorkOrder,
  WorkOrderPriority,
  WorkOrderSource,
  WorkOrderStatus,
} from './../src/work-orders/entities/work-order.entity';
import { registerAndLogin } from './utils/register-and-login';

describe('Work Orders — duplicate AUTO work-order prevention at the DB level (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let adminToken: string;
  let assetId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    dataSource = moduleFixture.get(DataSource);
    await app.init();

    adminToken = (
      await registerAndLogin(app, dataSource, {
        role: RoleName.ADMIN,
        emailPrefix: 'wo-dup-e2e-admin',
      })
    ).accessToken;

    const tag = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

    const plantId = (
      await request(app.getHttpServer())
        .post('/plants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `WO-dup-e2e Plant ${tag}` })
        .expect(201)
    ).body.id;

    const locationId = (
      await request(app.getHttpServer())
        .post('/locations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ plantId, name: `WO-dup-e2e Location ${tag}` })
        .expect(201)
    ).body.id;

    const assetTypeId = (
      await request(app.getHttpServer())
        .post('/asset-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `WO-dup-e2e Pump ${tag}` })
        .expect(201)
    ).body.id;

    assetId = (
      await request(app.getHttpServer())
        .post('/assets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assetTypeId, locationId, tag: `WO-dup-e2e-${tag}` })
        .expect(201)
    ).body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('lets exactly one of two concurrent AUTO work-order inserts for the same asset succeed', async () => {
    const workOrderRepo = dataSource.getRepository(WorkOrder);

    const insertAutoWorkOrder = (label: string) =>
      workOrderRepo.insert({
        assetId,
        status: WorkOrderStatus.OPEN,
        source: WorkOrderSource.AUTO,
        priority: WorkOrderPriority.HIGH,
        description: `Auto-generated: ${label}`,
      });

    // Two "workers" racing to open an auto work order for the same asset at
    // the same instant -- exactly the scenario Phase 10's condition
    // monitoring worker will create if two queue jobs process concurrently.
    const results = await Promise.allSettled([
      insertAutoWorkOrder('race-A'),
      insertAutoWorkOrder('race-B'),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    // Confirm the rejection came from the partial unique index itself, not
    // from some unrelated failure that would make this test pass for the
    // wrong reason.
    const rejection = rejected[0] as PromiseRejectedResult;
    expect(String(rejection.reason)).toMatch(
      /IDX_work_orders_one_open_auto_per_asset|duplicate key value/i,
    );

    const autoOpenCount = await workOrderRepo.count({
      where: {
        assetId,
        source: WorkOrderSource.AUTO,
        status: WorkOrderStatus.OPEN,
      },
    });
    expect(autoOpenCount).toBe(1);
  });
});
