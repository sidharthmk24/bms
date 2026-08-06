import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Exhibition } from './entities/exhibition.entity';
import { ExhibitionStock } from './entities/exhibition-stock.entity';
import { BranchInventory } from '../inventory/entities/branch-inventory.entity';

import { ExhibitionsController } from './exhibitions.controller';
import { ExhibitionsService } from './exhibitions.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Exhibition, ExhibitionStock, BranchInventory]),
    NotificationsModule,
  ],
  controllers: [ExhibitionsController],
  providers: [ExhibitionsService],
  exports: [ExhibitionsService],
})
export class ExhibitionsModule {}
