import { NextResponse } from 'next/server';
import { getDataSource } from '../../../../lib/db/data-source';

export async function GET() {
  const timestamp = new Date().toISOString();
  const uptime = process.uptime();

  try {
    const ds = await getDataSource();
    if (!ds.isInitialized) {
      await ds.initialize();
    }
    
    // Trivial query to prove the connection is actually alive
    await ds.query('SELECT 1');

    return NextResponse.json({
      status: 'ok',
      database: 'connected',
      uptime,
      timestamp,
    }, { status: 200 });

  } catch (error) {
    console.error('[HealthCheck] Database connection failed:', error);
    
    // Never leak connection strings, credentials, or stack traces
    return NextResponse.json({
      status: 'degraded',
      database: 'error',
      uptime,
      timestamp,
    }, { status: 503 });
  }
}
