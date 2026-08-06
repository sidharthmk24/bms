import { Controller, Sse, MessageEvent } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @ApiBearerAuth('JWT')
  @Sse('sync')
  @ApiOperation({
    summary: 'SSE Real-time Synchronization Stream',
    description: 'Establishes a Server-Sent Events stream. Emits a data sync trigger when records change, and a heartbeat every 30 seconds.',
  })
  sync(): Observable<MessageEvent> {
    return this.notificationsService.getRefreshStream();
  }
}
