import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// ── Entity imports ────────────────────────────────────────────────────────────
import { RestockRequest } from './entities/restock-request.entity';
import { RestockRequestItem } from './entities/restock-request-item.entity';
import { CentralStock } from '../inventory/entities/central-stock.entity';
import { BranchInventory } from '../inventory/entities/branch-inventory.entity';
import { Branch } from '../branches/entities/branch.entity';
import { Book } from '../catalog/entities/book.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';

// ── Controller & Service ─────────────────────────────────────────────────────
import { RestockController } from './restock.controller';
import { RestockService } from './restock.service';

// ── Module imports ────────────────────────────────────────────────────────────
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RestockRequest,
      RestockRequestItem,
      CentralStock,
      BranchInventory,
      Branch,
      Book,
      AuditLog,
    ]),
    NotificationsModule,
  ],
  controllers: [RestockController],
  providers: [RestockService],
  exports: [RestockService],
})
export class RestockModule {}
