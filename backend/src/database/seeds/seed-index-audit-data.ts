import AppDataSource from '../data-source';

const TELEMETRY_ROWS_PER_ASSET = 10_000;
const WORK_ORDER_COUNT = 5_000;
const SPARE_PART_COUNT = 150;
const AUDIT_LOG_ASSET_ROWS = 2_000;
const AUDIT_LOG_OTHER_ROWS = 8_000;

const WORK_ORDER_STATUSES = [
  'OPEN',
  'ASSIGNED',
  'IN_PROGRESS',
  'BLOCKED',
  'COMPLETED',
  'CANCELLED',
];
const OTHER_ENTITY_TYPES = [
  'WorkOrder',
  'SparePart',
  'MaintenancePlan',
  'Location',
];

async function seed(): Promise<void> {
  await AppDataSource.initialize();
  try {
    const assets: { id: string }[] = await AppDataSource.query(
      `SELECT id FROM assets`,
    );
    if (assets.length === 0) {
      throw new Error(
        'No assets found — run `npm run seed:demo` first so there is something to attach bulk data to.',
      );
    }
    console.log(`Found ${assets.length} assets to attach bulk data to.`);

    await AppDataSource.transaction(async (manager) => {
      for (const { id: assetId } of assets) {
        await manager.query(
          `
          INSERT INTO telemetry_readings (asset_id, temperature, vibration, pressure, recorded_at)
          SELECT
            $1,
            40 + random() * 20,
            2 + random() * 2,
            5 + random() * 3,
            now() - (n || ' minutes')::interval
          FROM generate_series(1, $2) AS n
          `,
          [assetId, TELEMETRY_ROWS_PER_ASSET],
        );
      }
      console.log(
        `Inserted ${TELEMETRY_ROWS_PER_ASSET} telemetry_readings per asset.`,
      );

      await manager.query(
        `
        INSERT INTO work_orders (asset_id, status, source, priority, description, opened_at)
        SELECT
          ($2::uuid[])[1 + floor(random() * $3)::int],
          ($4::text[])[1 + floor(random() * $5)::int]::work_orders_status_enum,
          'MANUAL',
          'MEDIUM',
          'Bulk seed work order #' || n || ' for index audit',
          now() - (n || ' hours')::interval
        FROM generate_series(1, $1) AS n
        `,
        [
          WORK_ORDER_COUNT,
          assets.map((a) => a.id),
          assets.length,
          WORK_ORDER_STATUSES,
          WORK_ORDER_STATUSES.length,
        ],
      );
      console.log(`Inserted ${WORK_ORDER_COUNT} work_orders.`);

      await manager.query(
        `
        INSERT INTO spare_parts (sku, name, quantity_on_hand, reorder_threshold, unit_cost)
        SELECT
          'BULK-AUDIT-' || n,
          'Bulk audit part #' || n,
          CASE WHEN random() < 0.3 THEN floor(random() * 5)::int ELSE 20 + floor(random() * 100)::int END,
          10,
          5 + random() * 200
        FROM generate_series(1, $1) AS n
        `,
        [SPARE_PART_COUNT],
      );
      console.log(`Inserted ${SPARE_PART_COUNT} spare_parts.`);

      await manager.query(
        `
        INSERT INTO audit_logs (entity_type, entity_id, action, source, created_at)
        SELECT
          'Asset',
          ($2::uuid[])[1 + floor(random() * $3)::int],
          'STATUS_CHANGE',
          'manual',
          now() - (n || ' minutes')::interval
        FROM generate_series(1, $1) AS n
        `,
        [AUDIT_LOG_ASSET_ROWS, assets.map((a) => a.id), assets.length],
      );
      await manager.query(
        `
        INSERT INTO audit_logs (entity_type, entity_id, action, source, created_at)
        SELECT
          ($2::text[])[1 + floor(random() * $3)::int],
          uuid_generate_v4(),
          'UPDATE',
          'manual',
          now() - (n || ' minutes')::interval
        FROM generate_series(1, $1) AS n
        `,
        [AUDIT_LOG_OTHER_ROWS, OTHER_ENTITY_TYPES, OTHER_ENTITY_TYPES.length],
      );
      console.log(
        `Inserted ${AUDIT_LOG_ASSET_ROWS + AUDIT_LOG_OTHER_ROWS} audit_logs.`,
      );
    });

    const [{ id: sampleAssetId }] = assets;
    console.log(
      '\nDone. Use this asset id for the telemetry/audit EXPLAIN queries:',
    );
    console.log(sampleAssetId);
  } finally {
    await AppDataSource.destroy();
  }
}

seed()
  .then(() => {
    console.log('\nIndex-audit bulk seed complete.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Index-audit bulk seed failed:', err);
    process.exit(1);
  });
