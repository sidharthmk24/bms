import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/auth/jwt';
import { notificationsEmitter } from '@/lib/services/notifications.service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  let payload;
  try {
    payload = verifyJwt(token);
  } catch (error) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  
  const userId = payload.userId;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      
      // Send initial connected event
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`));

      const onRefresh = (data: any) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'refresh', ...data })}\n\n`));
        } catch (e) {
          cleanup();
        }
      };

      const onNotification = (data: any) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'notification', ...data })}\n\n`));
        } catch (e) {
          cleanup();
        }
      };

      const onLegacyRefresh = () => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'refresh' })}\n\n`));
        } catch (e) {
          cleanup();
        }
      };

      // Subscribe to events
      notificationsEmitter.on(`refresh:${userId}`, onRefresh);
      notificationsEmitter.on(`notification:${userId}`, onNotification);
      notificationsEmitter.on('refresh', onLegacyRefresh);

      // 30s Heartbeat
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch (e) {
          cleanup();
        }
      }, 30000);

      const cleanup = () => {
        clearInterval(heartbeat);
        notificationsEmitter.off(`refresh:${userId}`, onRefresh);
        notificationsEmitter.off(`notification:${userId}`, onNotification);
        notificationsEmitter.off('refresh', onLegacyRefresh);
        try {
          controller.close();
        } catch (e) {}
      };

      // Handle close
      req.signal.addEventListener('abort', cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable Nginx buffering if used
    },
  });
}
