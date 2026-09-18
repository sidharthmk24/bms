"use client";

import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import RealTimeSync from '@/components/RealTimeSync';
import RoleSwitcher from '@/components/RoleSwitcher';
import NotificationDropdown from '@/components/NotificationDropdown';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import UserProfileDropdown from '@/components/UserProfileDropdown';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-surface-muted">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground animate-pulse">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="flex h-screen w-full bg-[#faf6f9]/50 overflow-hidden">
      <RealTimeSync />
      <Sidebar />
      <main className="flex-1 flex flex-col h-full overflow-y-auto min-w-0">
        <header className="h-16 border-b border-[#7e2562]/10 bg-white/90 backdrop-blur-xl flex items-center justify-between px-6 md:px-8 shadow-[0_1px_8px_-2px_rgba(126,37,98,0.04)] z-10 shrink-0 sticky top-0">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <span className="text-[#7e2562] font-bold">Kairali Books</span>
            <span>/</span>
            <span className="capitalize">{((user.role || user.primaryRole || '').replace(/_/g, ' ').toLowerCase())} workspace</span>
          </div>

          <div className="flex items-center space-x-3 sm:space-x-4">
            <NotificationDropdown />
            <RoleSwitcher />
            <UserProfileDropdown />
          </div>
        </header>

        <div className="p-6 md:p-8 flex-1 w-full max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
