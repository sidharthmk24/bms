import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// ── Entity imports ────────────────────────────────────────────────────────────
import { CentralStock } from './entities/central-stock.entity';
import { BranchInventory } from './entities/branch-inventory.entity';
import { StockMovement } from './entities/stock-movement.entity';
import { Book } from '../catalog/entities/book.entity';
import { Branch } from '../branches/entities/branch.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';

// ── Controller & Service ─────────────────────────────────────────────────────
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

// ── Module imports ────────────────────────────────────────────────────────────
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CentralStock,
      BranchInventory,
      StockMovement,
      Book,
      Branch,
      AuditLog,
    ]),
    NotificationsModule,
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
