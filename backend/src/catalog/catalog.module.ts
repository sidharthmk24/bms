import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// ── Entity imports ────────────────────────────────────────────────────────────
import { Book } from './entities/book.entity';
import { Author } from './entities/author.entity';
import { Publisher } from './entities/publisher.entity';
import { Category } from './entities/category.entity';
import { Supplier } from './entities/supplier.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';

// ── Controllers & Services ──────────────────────────────────────────────────
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';

// ── Module imports ────────────────────────────────────────────────────────────
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Book, Author, Publisher, Category, Supplier, AuditLog]),
    NotificationsModule,
  ],
  controllers: [CatalogController],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
