import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryTransaction } from './entities/inventory-transaction.entity';
import { SparePart } from './entities/spare-part.entity';
import { InventoryService } from './inventory.service';

@Module({
  imports: [TypeOrmModule.forFeature([SparePart, InventoryTransaction])],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
