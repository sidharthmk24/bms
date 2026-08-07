import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/auth/jwt';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    verifyJwt(token);
  } catch (error) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      
      // Send initial connected event
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`));

      // 30s Heartbeat
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch (e) {
          clearInterval(heartbeat);
        }
      }, 30000);

      // Handle close
      req.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable Nginx buffering if used on Hostinger
    },
  });
}
