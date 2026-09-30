"use client";

import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import RealTimeSync from '@/components/RealTimeSync';
import RoleSwitcher from '@/components/RoleSwitcher';
import NotificationDropdown from '@/components/NotificationDropdown';
import { Loader2, Calendar, MapPin, LogOut } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import UserProfileDropdown from '@/components/UserProfileDropdown';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, activeExhibition, exitExhibitionMode } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isExhibitionView = pathname ? (pathname.startsWith('/dashboard/exhibitions/') && pathname !== '/dashboard/exhibitions') : false;

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
        {/* Exhibition Mode Persistent Banner - only show when inside an exhibition view */}
        {activeExhibition && isExhibitionView && (
          <div className="bg-gradient-to-r from-[#7e2562] via-[#681b50] to-[#52133e] text-white px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md shrink-0 z-20">
            <div className="flex items-center gap-4 flex-wrap">
              <div>
                  {(activeExhibition.startDate || activeExhibition.endDate) ? (
                    <span className="text-xs text-pink-100 flex items-center gap-1 font-mono">
                      <Calendar className="w-3.5 h-3.5" />
                      {activeExhibition.startDate ? new Date(activeExhibition.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                      {activeExhibition.startDate && activeExhibition.endDate ? ' — ' : ''}
                      {activeExhibition.endDate ? new Date(activeExhibition.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                    </span>
                  ) : (
                    <span className="text-xs text-pink-100 flex items-center gap-1 font-mono">
                      <Calendar className="w-3.5 h-3.5" />
                      Live Event
                    </span>
                  )}
                <h1 className="text-base sm:text-lg font-black text-white leading-tight">
                  {activeExhibition.name || activeExhibition.eventName}
                </h1>
              </div>

              <div className="text-xs text-pink-100 flex items-center gap-3 border-l border-white/20 pl-4 hidden lg:flex">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-pink-200" /> {activeExhibition.location}
                </span>
                <span>•</span>
                <span>
                  Source: <strong>{activeExhibition.sourceBranch?.name || activeExhibition.sourceBranchName || 'Central Warehouse'}</strong>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  exitExhibitionMode();
                  router.push('/dashboard/exhibitions');
                }}
                className="text-xs font-bold bg-white/15 hover:bg-white/25 text-white px-3.5 py-1.5 rounded-md transition-colors border border-white/20 active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" /> Exit Exhibition Mode
              </button>
            </div>
          </div>
        )}

        <header className="h-16 border-b border-[#7e2562]/10 bg-white/90 backdrop-blur-xl flex items-center justify-between px-6 md:px-8 shadow-[0_1px_8px_-2px_rgba(126,37,98,0.04)] z-10 shrink-0 sticky top-0">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <span className="text-[#7e2562] font-bold">Kairali Books</span>
            <span>/</span>
            <span className="capitalize">{((user.role || user.primaryRole || '').replace(/_/g, ' ').toLowerCase())} workspace</span>
            {activeExhibition && isExhibitionView && (
              <>
                <span>/</span>
                <span className="text-[#7e2562] font-semibold">{activeExhibition.name}</span>
              </>
            )}
          </div>

          <div className="flex items-center space-x-3 sm:space-x-4">
            <NotificationDropdown />
            <RoleSwitcher />
            <UserProfileDropdown />
          </div>
        </header>

        <div className="flex-1 px-4 py-8 md:px-8 md:py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
