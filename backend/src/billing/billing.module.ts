import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// ── Entity imports ────────────────────────────────────────────────────────────
import { Bill } from './entities/bill.entity';
import { BillItem } from './entities/bill-item.entity';
import { Book } from '../catalog/entities/book.entity';
import { Branch } from '../branches/entities/branch.entity';
import { User } from '../users/entities/user.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';

// ── Controller & Service ─────────────────────────────────────────────────────
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';

// ── Module imports ────────────────────────────────────────────────────────────
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Bill, BillItem, Book, Branch, User, AuditLog]),
    NotificationsModule,
  ],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
