import 'server-only';
export class NotificationsService {
  async triggerRefresh(event: string) {
    // In Phase 3, this will send an SSE event to Next.js clients.
    console.log(`[SSE Stub] Triggering refresh event: ${event}`);
  }
}
