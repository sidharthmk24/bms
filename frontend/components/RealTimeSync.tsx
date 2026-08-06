"use client";

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function RealTimeSync() {
  const { token } = useAuth();

  useEffect(() => {
    if (!token) return;

    // Connect to SSE notifications endpoint
    const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'}/notifications/sync?token=${token}`;
    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'refresh') {
          // Trigger global data mutation event so components re-fetch data
          window.dispatchEvent(new Event('app:data-mutated'));
        }
      } catch (err) {
        // Heartbeats might not be JSON, ignore parsing errors for heartbeats
      }
    };

    eventSource.onerror = () => {
      // EventSource will automatically try to reconnect. 
      // We could add exponential backoff or max retries if necessary.
    };

    return () => {
      eventSource.close();
    };
  }, [token]);

  return null; // This component does not render anything
}
