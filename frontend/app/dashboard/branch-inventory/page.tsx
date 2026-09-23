"use client";

import { useState } from 'react';
import { useApiData } from '@/hooks/useApiData';
import { StatCard } from '@/components/StatCard';
import { 
  AlertTriangle, 
  Package, 
  ArchiveRestore, 
  Send, 
  Loader2, 
  Plus, 
  ArrowRight,
  TrendingDown,
  Building2,
  CheckCircle2
} from 'lucide-react';
import Link from 'next/link';
import CreateTransferModal, { InitialBookInfo } from '@/components/CreateTransferModal';

interface BranchLowStockItem {
  bookId?: string;
  title: string;
  isbn: string;
  quantity: number;
  reorderThreshold: number;
}

interface BranchRestockSummary {
  id: string;
  requestNumber: string;
  status: string;
  createdAt: string;
}

interface OngoingExhibitionSummary {
  id: string;
  name: string;
  location?: string;
  status: string;
  startDate?: string;
  endDate?: string;
}

export default function BranchInventoryDashboard() {
  const { data, loading, error } = useApiData<any>('/dashboard/branch-inventory');
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [selectedTransferBook, setSelectedTransferBook] = useState<InitialBookInfo | null>(null);

  const handleRequestStock = (item: BranchLowStockItem) => {
    const qtyNeeded = item.reorderThreshold && item.reorderThreshold > item.quantity
      ? item.reorderThreshold - item.quantity
      : 5;

    setSelectedTransferBook({
      bookId: item.bookId,
      title: item.title,
      isbn: item.isbn,
      quantity: Math.max(1, qtyNeeded),
    });
    setIsTransferModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#7e2562]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-[#e45e34] bg-[#fef5f2] p-4 rounded-xl border border-[#e45e34]/20 font-medium text-sm">
        Error loading Branch Inventory dashboard: {error}
      </div>
    );
  }

  const lowStockItems: BranchLowStockItem[] = data?.lowStockItemsList || [];
  const restockRequests: BranchRestockSummary[] = data?.recentRestockRequestsList || [];
  const exhibitions: OngoingExhibitionSummary[] = data?.ongoingExhibitionsList || [];

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Branch Inventory</h2>
          <p className="text-sm text-gray-500">Local store stock monitoring, branch replenishment, and logistics.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/dashboard/restock"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#7e2562] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#681b50] transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Request Restock</span>
          </Link>
          <Link
            href="/dashboard/transfers"
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 shadow-2xs hover:bg-gray-50 transition-colors"
          >
            <Package className="h-4 w-4 text-gray-500" />
            <span>Stock Transfers</span>
          </Link>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Low Stock Items" 
          value={data?.lowStockCount || 0} 
          icon={AlertTriangle} 
          color={data?.lowStockCount > 0 ? 'red' : 'green'} 
        />
        <StatCard 
          title="Pending Restocks" 
          value={data?.pendingRestocks || 0} 
          icon={Package} 
          color={data?.pendingRestocks > 0 ? 'amber' : 'blue'} 
        />
        <StatCard 
          title="Awaiting Receipt" 
          value={data?.awaitingReceipt || 0} 
          icon={ArchiveRestore} 
          color="purple" 
        />
        <StatCard 
          title="Total Branch Copies" 
          value={(data?.totalBranchStockUnits || 0).toLocaleString('en-IN')} 
          icon={Send} 
          color="blue" 
        />
      </div>

      {/* Main Content Layout — 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Spans): Branch Low Stock Warnings */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-rose-600" />
                  <span>Branch Low Stock Alerts</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Books running low at this branch that need replenishment from central stock.</p>
              </div>
              <Link href="/dashboard/restock" className="text-xs font-bold text-[#7e2562] hover:underline inline-flex items-center gap-1">
                <span>Stock Transfer</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {lowStockItems.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-6 text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500 mb-2" />
                <p className="text-xs font-bold text-gray-900">Branch Inventory is Fully Stocked</p>
                <p className="text-[11px] text-gray-500 mt-0.5">No items are below local safety thresholds.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-gray-100 bg-gray-50/70 text-gray-500 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Book Title</th>
                      <th className="px-4 py-3">ISBN</th>
                      <th className="px-4 py-3 text-center">Available Stock</th>
                      <th className="px-4 py-3 text-center">Reorder Threshold</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                    {lowStockItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-4 py-3 font-bold text-gray-900 max-w-xs truncate" title={item.title}>
                          {item.title}
                        </td>
                        <td className="px-4 py-3 font-mono text-gray-500 text-[11px]">
                          {item.isbn || '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700 border border-rose-200">
                            {item.quantity} Copies
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-500 font-semibold">
                          {item.reorderThreshold}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleRequestStock(item)}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#7e2562]/30 bg-[#faedf5]/80 px-2.5 py-1 text-[11px] font-extrabold text-[#7e2562] hover:bg-[#7e2562] hover:text-white transition-all shadow-2xs cursor-pointer active:scale-95"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Request</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 Span): Restock Requests & Ongoing Exhibitions */}
        <div className="space-y-6">
          {/* Section 1: Recent Restock Requests */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Package className="h-4 w-4 text-amber-600" />
                <span>Recent Restock Demands</span>
              </h3>
              <Link href="/dashboard/restock" className="text-xs font-bold text-[#7e2562] hover:underline">
                View All
              </Link>
            </div>

            {restockRequests.length === 0 ? (
              <p className="text-xs text-gray-500 py-3 text-center">No restock requests submitted.</p>
            ) : (
              <div className="space-y-2.5">
                {restockRequests.map((rr) => (
                  <div key={rr.id} className="rounded-xl border border-gray-100 bg-gray-50/50 p-3 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-mono font-bold text-gray-700">{rr.requestNumber}</span>
                      <p className="text-[11px] text-gray-500">Requested {rr.createdAt ? rr.createdAt.slice(0, 10) : 'Recently'}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                      rr.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      rr.status === 'FULFILLED' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                      'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      {rr.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Ongoing Exhibition Allocations */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Send className="h-4 w-4 text-blue-600" />
                <span>Ongoing Exhibitions</span>
              </h3>
              <Link href="/dashboard/exhibitions" className="text-xs font-bold text-[#7e2562] hover:underline">
                View All
              </Link>
            </div>

            {exhibitions.length === 0 ? (
              <p className="text-xs text-gray-500 py-3 text-center">No active exhibition stock allocations.</p>
            ) : (
              <div className="space-y-2.5">
                {exhibitions.map((ex) => (
                  <div key={ex.id} className="rounded-xl border border-gray-100 bg-gray-50/50 p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-gray-900 truncate" title={ex.name}>{ex.name}</p>
                      <span className="rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 text-[9px] font-bold">
                        ONGOING
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500">{ex.location || 'External Event Location'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stock Transfer Request Modal prefilled with low stock book */}
      <CreateTransferModal
        isOpen={isTransferModalOpen}
        onClose={() => {
          setIsTransferModalOpen(false);
          setSelectedTransferBook(null);
        }}
        onSuccess={() => {
          setIsTransferModalOpen(false);
          setSelectedTransferBook(null);
        }}
        initialBook={selectedTransferBook}
      />
    </div>
  );
}
