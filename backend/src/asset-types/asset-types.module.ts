import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { AssetTypesController } from './asset-types.controller';
import { AssetTypesService } from './asset-types.service';
import { AssetType } from './entities/asset-type.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AssetType]), AuditModule],
  controllers: [AssetTypesController],
  providers: [AssetTypesService],
  exports: [AssetTypesService],
})
export class AssetTypesModule {}
