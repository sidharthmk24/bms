"use client";

import { useState, useEffect, ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Loader2, ArrowLeft, AlertCircle } from 'lucide-react';
import { ExhibitionContext } from './ExhibitionContext';
import { ExhibitionTopLiveDashboard } from './ExhibitionTopLiveDashboard';

export default function ExhibitionLayout({ children }: { children: ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const { user, enterExhibitionMode } = useAuth();
  const exhibitionId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<any>(null);

  const fetchWorkspaceData = async (silent = false) => {
    if (!exhibitionId) return;
    if (!silent) setLoading(true);
    try {
      const [dashRes, exRes] = await Promise.all([
        api.get(`/exhibitions/${exhibitionId}/dashboard`),
        api.get(`/exhibitions/${exhibitionId}`).catch(() => null)
      ]);

      if (dashRes.success && dashRes.data) {
        const fullExhibition = exRes?.success && exRes?.data ? exRes.data : dashRes.data.exhibition;
        const stockList = fullExhibition?.stock && fullExhibition.stock.length > 0
          ? fullExhibition.stock
          : (dashRes.data.eventToDate?.sellThroughList || []);

        if (fullExhibition && enterExhibitionMode) {
          enterExhibitionMode({
            id: fullExhibition.id || exhibitionId,
            name: fullExhibition.name || fullExhibition.eventName || 'Exhibition',
            location: fullExhibition.location || '',
            role: fullExhibition.assignments?.find((a: any) => a.userId === user?.id)?.role || 'LEAD',
            startDate: fullExhibition.startDate || fullExhibition.eventStartDate,
            endDate: fullExhibition.endDate || fullExhibition.eventEndDate,
          });
        }

        setData({
          ...dashRes.data,
          exhibition: {
            ...dashRes.data.exhibition,
            ...fullExhibition,
            stock: stockList
          },
          metrics: {
            ...dashRes.data.today,
            ...dashRes.data.eventToDate,
            totalRevenue: dashRes.data.eventToDate?.totalRevenue || 0,
            totalDispatched: dashRes.data.eventToDate?.stock?.taken || 0,
            totalSold: dashRes.data.eventToDate?.stock?.sold || 0,
            totalRemaining: dashRes.data.eventToDate?.stock?.remaining || 0,
            cashTotal: dashRes.data.eventToDate?.cashVsUpi?.cash || 0,
            upiTotal: dashRes.data.eventToDate?.cashVsUpi?.upi || 0,
          }
        });
      } else {
        if (!silent) setError(dashRes.message || 'Failed to load exhibition details.');
      }
    } catch (err: any) {
      if (!silent) setError(err.response?.data?.message || 'Error loading live exhibition workspace.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      const roles = user.roles || [user.role || user.primaryRole || ''];
      const isCentralOnly = roles.includes('CENTRAL_INVENTORY_MANAGER') &&
        !roles.includes('SUPER_ADMIN') &&
        !roles.includes('ADMIN') &&
        !roles.includes('BRANCH_MANAGER');

      if (isCentralOnly) {
        setError('Access Denied: Central Inventory Managers do not have permission to access Exhibition Live Workspace or perform day-close reconciliations.');
        setLoading(false);
        return;
      }
    }

    fetchWorkspaceData(false);

    // 1. Silent live polling interval (every 4 seconds) for real-time sales reflect
    const interval = setInterval(() => {
      fetchWorkspaceData(true);
    }, 4000);

    // 2. Listen to real-time SSE app mutation events
    const handleMutation = () => {
      fetchWorkspaceData(true);
    };
    window.addEventListener('app:data-mutated', handleMutation);

    return () => {
      clearInterval(interval);
      window.removeEventListener('app:data-mutated', handleMutation);
    };
  }, [exhibitionId, user]);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-[#7e2562]" />
        <p className="text-sm font-semibold text-gray-500">Loading Live Exhibition Workspace...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <button 
          onClick={() => router.push('/dashboard/exhibitions')}
          className="mb-4 inline-flex items-center text-xs font-semibold text-gray-600 hover:text-[#7e2562]"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Exhibitions List
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <h3 className="text-base font-bold text-red-900">Workspace Unavailable</h3>
          <p className="text-xs text-red-700">{error || 'Exhibition not found.'}</p>
        </div>
      </div>
    );
  }

  const { exhibition, metrics } = data;
  const isLead = exhibition?.assignedUserId === user?.id || ['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER'].includes(user?.role || '');
  const isClosed = ['CLOSED', 'REJECTED', 'CANCELLED'].includes(exhibition?.status || '');
  const isDispatched = ['DISPATCHED', 'ONGOING', 'CLOSED', 'OVERDUE'].includes(exhibition?.status || '');

  if (isClosed) {
    return (
      <div className="p-8 max-w-2xl mx-auto my-12">
        <div className="bg-slate-900 text-white rounded-2xl p-8 border border-slate-800 shadow-2xl text-center space-y-5">
          <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-zinc-800 text-zinc-300 rounded-full border border-zinc-700">
              Exhibition Closed & Reconciled
            </span>
            <h2 className="text-2xl font-black text-white mt-3">{exhibition?.name || 'Exhibition Event'}</h2>
            <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
              This exhibition has been finalized and closed. Live POS billing and venue operations are terminated. All unsold stock has been reconciled and returned to main inventory.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-center gap-3">
            <button
              onClick={() => router.push('/dashboard/exhibitions')}
              className="px-6 py-3 text-xs font-black uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Return to Exhibitions List
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ExhibitionContext.Provider value={{
      exhibitionId,
      data,
      exhibition,
      metrics,
      loading,
      error,
      fetchWorkspaceData: () => fetchWorkspaceData(true),
      isLead
    }}>
      <div className="w-full space-y-4">
        {!isDispatched && (
          <div className="bg-amber-500/15 border border-amber-500/30 rounded-xl p-3 text-xs font-semibold text-amber-900 flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <span className="font-extrabold uppercase tracking-wide text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded mr-2 border border-amber-300">
                  Stock Pending Dispatch
                </span>
                <span>
                  The allocated stock for <strong>"{exhibition?.name || 'this exhibition'}"</strong> has not been dispatched by authorities (Super Admin / Manager) yet. Venue inventory and live billing will become active once dispatched.
                </span>
              </div>
            </div>
            <button
              onClick={() => router.push('/dashboard/exhibitions')}
              className="px-3 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition shrink-0 cursor-pointer"
            >
              Go to Exhibitions List
            </button>
          </div>
        )}

        {children}
      </div>
    </ExhibitionContext.Provider>
  );
}
