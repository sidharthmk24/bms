"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { 
  Plus, 
  RefreshCw, 
  ArrowRight, 
  ArrowLeftRight,
  Clock, 
  AlertCircle, 
  Search, 
  FileText,
  Loader2
} from 'lucide-react';
import CreateTransferModal from '@/components/CreateTransferModal';
import TransferDetailsModal from '@/components/TransferDetailsModal';
import { Pagination } from '@/components/Pagination';
import { matchKeywords } from '@/lib/searchUtils';

export default function StockTransfersPage() {
  const { user } = useAuth();
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTransferId, setSelectedTransferId] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const fetchTransfers = async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (statusFilter) queryParams.append('status', statusFilter);
      queryParams.append('_t', String(Date.now()));
      
      const response = await api.get(`/transfers?${queryParams.toString()}`);
      if (response.success && response.data) {
        setTransfers(response.data.items || response.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch transfers:', err);
      setError('Failed to load stock transfers.');
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  const handleTransferUpdated = (updatedTransfer?: any) => {
    if (updatedTransfer && updatedTransfer.id) {
      setTransfers(prev => prev.map(t => t.id === updatedTransfer.id ? { ...t, ...updatedTransfer } : t));
    }
    fetchTransfers(false);
  };

  const handleTransferCreated = (newTransfer?: any) => {
    if (newTransfer && newTransfer.id) {
      setTransfers(prev => [newTransfer, ...prev.filter(t => t.id !== newTransfer.id)]);
    }
    fetchTransfers(false);
  };

  useEffect(() => {
    fetchTransfers(true);

    const handleMutation = () => {
      fetchTransfers(false);
    };

    window.addEventListener('app:data-mutated', handleMutation);
    return () => {
      window.removeEventListener('app:data-mutated', handleMutation);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const handleRowClick = (id: string) => {
    setSelectedTransferId(id);
    setIsDetailsOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'DISPATCHED':
        return 'bg-sky-50 text-sky-700 border-sky-200 animate-pulse';
      case 'RECEIVED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'REJECTED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'CANCELLED':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  // Filter transfers by search query locally
  const filteredTransfers = transfers.filter((t) => {
    const bookTitles = t.items?.map((i: any) => i.book?.title || '').join(' ') || '';
    const isbns = t.items?.map((i: any) => i.book?.isbn || '').join(' ') || '';
    const barcodes = t.items?.map((i: any) => i.book?.barcode || '').join(' ') || '';
    const authors = t.items?.map((i: any) => i.book?.author?.name || '').join(' ') || '';
    return matchKeywords(
      searchQuery,
      t.transferNumber,
      t.fromBranch?.name,
      t.toBranch?.name,
      t.requestedBy?.name,
      t.status,
      bookTitles,
      isbns,
      barcodes,
      authors
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Stock Transfers</h2>
          <p className="text-sm text-slate-500 mt-0.5">Request, dispatch, and track book stock exchanges between retail branches and warehouse</p>
        </div>
        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={() => fetchTransfers()}
            className="p-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-500 hover:text-slate-700 transition"
            title="Refresh list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          
          {user?.roles?.some(r => ['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER', 'BRANCH_INVENTORY', 'CENTRAL_INVENTORY_MANAGER'].includes(r)) && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-500/10 flex items-center space-x-2 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Request Transfer</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters & Tabs */}
      <div className="bg-white border border-slate-200/60 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
        {/* Status filter tabs */}
        <div className="flex items-center space-x-1.5 overflow-x-auto shrink-0 pb-1 md:pb-0">
          {[
            { value: '', label: 'All Transfers' },
            { value: 'PENDING', label: 'Pending' },
            { value: 'DISPATCHED', label: 'In Transit' },
            { value: 'RECEIVED', label: 'Received' },
            { value: 'REJECTED', label: 'Rejected' },
            { value: 'CANCELLED', label: 'Cancelled' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setStatusFilter(tab.value);
                setCurrentPage(1);
              }}
              className={`px-4 py-2 text-xs font-semibold rounded-lg border transition whitespace-nowrap ${
                statusFilter === tab.value
                  ? 'bg-blue-600 border-blue-600 text-white font-bold shadow-md shadow-blue-500/10'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100/70'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative md:w-64 w-full">
          <input
            type="text"
            placeholder="Search ID, branch, book, keywords..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        </div>
      </div>

      {/* Main List */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-sm font-semibold flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-slate-200/60 rounded-2xl py-24 flex flex-col items-center justify-center space-y-4 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
          <p className="text-sm font-semibold text-slate-400">Loading transfers list...</p>
        </div>
      ) : filteredTransfers.length === 0 ? (
        <div className="bg-white border border-slate-200/60 rounded-2xl py-24 text-center space-y-4 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
          <div className="p-4 bg-slate-50 rounded-full inline-block">
            <ArrowLeftRight className="w-8 h-8 text-slate-300" />
          </div>
          <div>
            <h4 className="text-base font-bold text-slate-700">No stock transfers found</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-[20rem] mx-auto">
              There are no stock transfer requests matching your query or branch scope.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/60 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Transfer Number</th>
                  <th className="px-6 py-4">Source (From)</th>
                  <th className="px-6 py-4">Destination (To)</th>
                  <th className="px-6 py-4">Requester</th>
                  <th className="px-6 py-4">Items count</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Requested Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
                {filteredTransfers.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => handleRowClick(t.id)}
                    className="hover:bg-slate-50/50 cursor-pointer transition duration-150"
                  >
                    <td className="px-6 py-4 font-mono font-bold text-slate-800">{t.transferNumber}</td>
                    <td className="px-6 py-4 font-semibold text-slate-700">{t.fromBranch.name}</td>
                    <td className="px-6 py-4 font-semibold text-slate-700">{t.toBranch.name}</td>
                    <td className="px-6 py-4">{t.requestedBy?.name || 'BMS Staff'}</td>
                    <td className="px-6 py-4 font-semibold">{t.items?.length || 0} books</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 border text-xs font-semibold rounded-full ${getStatusBadge(t.status)}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 flex items-center space-x-1.5 text-xs text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        {new Date(t.createdAt).toLocaleDateString(undefined, { dateStyle: 'short' })}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={currentPage}
            totalItems={filteredTransfers.length}
            pageSize={pageSize}
            onPageChange={(page) => setCurrentPage(page)}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
          />
        </div>
      )}

      {/* Modals */}
      <CreateTransferModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={handleTransferCreated}
      />

      <TransferDetailsModal
        transferId={selectedTransferId}
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedTransferId(null);
        }}
        onSuccess={handleTransferUpdated}
      />
    </div>
  );
}
