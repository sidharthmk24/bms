"use client";

import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import RealTimeSync from '@/components/RealTimeSync';
import RoleSwitcher from '@/components/RoleSwitcher';
import NotificationDropdown from '@/components/NotificationDropdown';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

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
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm font-medium text-gray-500 animate-pulse">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  
  return (
    <div className="flex h-screen w-full bg-gray-50 overflow-hidden">
      <RealTimeSync />
      <Sidebar />
      <main className="flex-1 flex flex-col h-full overflow-y-auto min-w-0">
        <header className="h-24 border-b border-slate-200/60 bg-slate-50/40 backdrop-blur-xl flex items-center justify-between px-8 shadow-[0_4px_24px_rgba(0,0,0,0.02)] z-10 shrink-0 sticky top-0">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 tracking-tight">Workspace Overview</h1>
          <div className="flex items-center space-x-4">
            <NotificationDropdown />
            <RoleSwitcher />
          </div>
        </header>
        <div className="p-8 flex-1 w-full max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
