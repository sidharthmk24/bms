"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function StandaloneStockRedirect() {
  const router = useRouter();
  const { activeExhibition, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (activeExhibition?.id) {
      router.replace(`/dashboard/exhibitions/${activeExhibition.id}/stock`);
    } else {
      router.replace('/dashboard/exhibitions');
    }
  }, [activeExhibition, isLoading, router]);

  return (
    <div className="flex h-[60vh] w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-[#7e2562]" />
    </div>
  );
}
