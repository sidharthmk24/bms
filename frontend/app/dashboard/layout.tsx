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
          <div className="flex items-center space-x-3 sm:space-x-4">
            <NotificationDropdown />
            <RoleSwitcher />

            {/* User Profile Card */}
            <div className="flex items-center gap-3 pl-1.5 pr-4 py-1.5 bg-white/90 border border-slate-200/80 rounded-2xl shadow-xs backdrop-blur-md group hover:shadow-sm hover:border-slate-300 transition-all duration-200">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-700 text-white flex items-center justify-center font-bold text-sm shadow-xs ring-2 ring-white/80 shrink-0">
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="flex flex-col text-left min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-slate-900 tracking-tight truncate max-w-[140px] leading-none">
                    {user.name}
                  </p>
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                </div>
                <p className="text-[11px] font-medium text-slate-500 capitalize leading-tight mt-1 truncate max-w-[170px]">
                  {(user.role || user.primaryRole || '').replace(/_/g, ' ').toLowerCase()}
                  {user.branch?.name ? ` • ${user.branch.name}` : ''}
                </p>
              </div>
            </div>
          </div>
        </header>
        <div className="p-8 flex-1 w-full max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
