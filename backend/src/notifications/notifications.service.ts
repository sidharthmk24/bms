import { Injectable, MessageEvent } from '@nestjs/common';
import { Subject, Observable, interval, merge } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class NotificationsService {
  // Subject acting as the central event bus for real-time notifications
  private readonly refreshStream$ = new Subject<MessageEvent>();

  /**
   * Broadcasts a refresh trigger event to all active SSE connections.
   *
   * @param eventName The name of the event (e.g., 'stock_changed', 'bill_created')
   */
  triggerRefresh(eventName: string): void {
    console.log(`[SSE Broadcast] Triggering refresh event: ${eventName}`);
    this.refreshStream$.next({
      data: eventName,
      type: 'message', // SSE message type
    });
  }

  /**
   * Returns the event stream combined with a 30-second heartbeat ping.
   * The heartbeat prevents proxies or load balancers from closing the connection due to inactivity.
   */
  getRefreshStream(): Observable<MessageEvent> {
    const heartbeat$ = interval(30000).pipe(
      map(() => ({
        data: 'heartbeat',
        type: 'ping', // ping event to check connection
      } as MessageEvent)),
    );

    return merge(this.refreshStream$.asObservable(), heartbeat$);
  }
}
