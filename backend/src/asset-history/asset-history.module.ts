import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssetStateHistory } from './entities/asset-state-history.entity';
import { AssetHistoryService } from './asset-history.service';

@Module({
  imports: [TypeOrmModule.forFeature([AssetStateHistory])],
  providers: [AssetHistoryService],
  exports: [AssetHistoryService],
})
export class AssetHistoryModule {}
