"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function RestockRequestsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/transfers');
  }, [router]);

  return (
    <div className="py-24 flex flex-col items-center justify-center space-y-3">
      <Loader2 className="w-8 h-8 animate-spin text-[#7e2562]" />
      <p className="text-xs font-semibold text-neutral-500">Redirecting to Stock Transfers & Movements...</p>
    </div>
  );
}
