import { readFileSync } from 'fs';
import { join } from 'path';
import AppDataSource from '../data-source';
import { Asset } from '../../assets/entities/asset.entity';
import { AssetType } from '../../asset-types/entities/asset-type.entity';
import { Location } from '../../locations/entities/location.entity';
import { Plant } from '../../plants/entities/plant.entity';

interface SimulatedAsset {
  assetId: string;
  plantId: string;
  tag: string;
}

const DEMO_PLANT_NAME = 'Demo Plant';
const DEMO_LOCATION_NAME = 'Main Hall';
const ASSET_TYPE_CATEGORY = 'Rotating equipment';

function loadSimulatedAssets(): SimulatedAsset[] {
  const configPath = join(
    __dirname,
    '..',
    '..',
    '..',
    '..',
    'simulator',
    'config',
    'assets.json',
  );
  return JSON.parse(readFileSync(configPath, 'utf-8')) as SimulatedAsset[];
}

function assetTypeNameFor(tag: string): string {
  const prefix = tag.split('-')[0].toLowerCase();
  return prefix.charAt(0).toUpperCase() + prefix.slice(1);
}

async function seed(): Promise<void> {
  const simulated = loadSimulatedAssets();
  const plantIds = new Set(simulated.map((a) => a.plantId));
  if (plantIds.size !== 1) {
    throw new Error(
      'simulator/config/assets.json must reference exactly one plantId',
    );
  }
  const [plantId] = [...plantIds];

  await AppDataSource.initialize();
  try {
    await AppDataSource.transaction(async (manager) => {
      const plantRepo = manager.getRepository(Plant);
      const locationRepo = manager.getRepository(Location);
      const assetTypeRepo = manager.getRepository(AssetType);
      const assetRepo = manager.getRepository(Asset);

      let plant = await plantRepo.findOneBy({ id: plantId });
      if (!plant) {
        plant = await plantRepo.save(
          plantRepo.create({
            id: plantId,
            name: DEMO_PLANT_NAME,
            address: null,
          }),
        );
        console.log(`Created plant: ${DEMO_PLANT_NAME} (${plantId})`);
      } else {
        console.log(`Plant already exists: ${plant.name}`);
      }

      let location = await locationRepo.findOneBy({
        plantId,
        name: DEMO_LOCATION_NAME,
      });
      if (!location) {
        location = await locationRepo.save(
          locationRepo.create({
            plantId,
            name: DEMO_LOCATION_NAME,
            parentLocationId: null,
          }),
        );
        console.log(`Created location: ${DEMO_LOCATION_NAME}`);
      } else {
        console.log(`Location already exists: ${DEMO_LOCATION_NAME}`);
      }

      for (const item of simulated) {
        const existing = await assetRepo.findOneBy({ id: item.assetId });
        if (existing) {
          console.log(`Asset already exists: ${item.tag}`);
          continue;
        }

        const typeName = assetTypeNameFor(item.tag);
        let assetType = await assetTypeRepo.findOneBy({ name: typeName });
        if (!assetType) {
          assetType = await assetTypeRepo.save(
            assetTypeRepo.create({
              name: typeName,
              category: ASSET_TYPE_CATEGORY,
            }),
          );
          console.log(`Created asset type: ${typeName}`);
        }

        await assetRepo.save(
          assetRepo.create({
            id: item.assetId,
            tag: item.tag,
            assetTypeId: assetType.id,
            locationId: location.id,
          }),
        );
        console.log(`Created asset: ${item.tag} (${item.assetId})`);
      }
    });
  } finally {
    await AppDataSource.destroy();
  }
}

seed()
  .then(() => {
    console.log('Demo seed complete.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Demo seed failed:', err);
    process.exit(1);
  });
