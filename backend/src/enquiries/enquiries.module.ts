import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BookEnquiry } from './entities/book-enquiry.entity';
import { NewTitleRequest } from './entities/new-title-request.entity';

import { EnquiriesController } from './enquiries.controller';
import { NewTitleRequestsController } from './new-title-requests.controller';
import { EnquiriesService } from './enquiries.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BookEnquiry, NewTitleRequest]),
    NotificationsModule,
  ],
  controllers: [EnquiriesController, NewTitleRequestsController],
  providers: [EnquiriesService],
  exports: [EnquiriesService],
})
export class EnquiriesModule {}
