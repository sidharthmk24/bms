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

            {/* User Profile Card */}
            <div className="flex items-center gap-2.5 pl-1.5 pr-3.5 py-1 bg-white border border-[#7e2562]/15 rounded-sm shadow-xs backdrop-blur-md group hover:shadow-plum-sm hover:border-primary/30 transition-all duration-200">
              <div className="w-7 h-7 rounded-sm bg-gradient-to-tr from-[#7e2562] via-[#9b3179] to-[#681b50] text-white flex items-center justify-center font-bold text-xs shadow-xs ring-1 ring-white/80 shrink-0">
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="flex flex-col text-left min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold text-foreground tracking-tight truncate max-w-[130px] leading-none">
                    {user.name}
                  </p>
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#3cb976]"></span>
                  </span>
                </div>
                <p className="text-[10px] font-medium text-muted-foreground capitalize leading-tight mt-0.5 truncate max-w-[150px]">
                  {(user.role || user.primaryRole || '').replace(/_/g, ' ').toLowerCase()}
                  {user.branch?.name ? ` • ${user.branch.name}` : ''}
                </p>
              </div>
            </div>
          </div>
        </header>
        <div className="p-6 md:p-8 flex-1 w-full max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
