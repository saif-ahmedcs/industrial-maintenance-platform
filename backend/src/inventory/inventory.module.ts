import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { InventoryTransaction } from './entities/inventory-transaction.entity';
import { SparePart } from './entities/spare-part.entity';
import { InventoryService } from './inventory.service';
import { SparePartsController } from './spare-parts.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([SparePart, InventoryTransaction]),
    AuditModule,
  ],
  controllers: [SparePartsController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
