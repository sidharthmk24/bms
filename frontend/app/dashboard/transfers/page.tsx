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
  Loader2,
  Eye
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
  const [pageSize, setPageSize] = useState(20);

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
        return 'bg-[#fffbeb] text-[#b45309] border-[#fde68a]';
      case 'DISPATCHED':
        return 'bg-[#faedf5] text-primary border-primary/20 animate-pulse';
      case 'RECEIVED':
        return 'bg-[#f0fbf5] text-[#22794d] border-[#bcecd2]';
      case 'REJECTED':
        return 'bg-[#fef5f2] text-danger border-[#fbd5c9]';
      case 'CANCELLED':
        return 'bg-[#faf6f9] text-muted-foreground border-[#ece3ea]';
      default:
        return 'bg-[#faf6f9] text-muted-foreground border-[#ece3ea]';
    }
  };

  // Filter transfers by search query locally
  const filteredTransfers = transfers.filter((t) => {
    const bookTitles = t.items?.map((i: any) => i.book?.title).join(' ') || '';
    const isbns = t.items?.map((i: any) => i.book?.isbn).join(' ') || '';
    const barcodes = t.items?.map((i: any) => i.book?.barcode).join(' ') || '';
    const authors = t.items?.map((i: any) => i.book?.author?.name).join(' ') || '';
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
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Stock Transfers</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Request, dispatch, and track book stock exchanges between retail branches and warehouse</p>
        </div>
        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={() => fetchTransfers()}
            className="p-2 border border-[#7e2562]/15 hover:bg-[#faedf5] rounded-sm text-muted-foreground hover:text-primary transition cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          
          {user?.roles?.some(r => ['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER', 'BRANCH_INVENTORY', 'CENTRAL_INVENTORY_MANAGER'].includes(r)) && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="apple-button px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-sm shadow-plum-sm flex items-center space-x-2 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Request Transfer</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters & Tabs */}
      <div className="bg-white border border-[#7e2562]/15 rounded-sm p-3 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-plum-sm">
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
              className={`px-3.5 py-1.5 text-xs font-bold rounded-sm border transition whitespace-nowrap cursor-pointer ${
                statusFilter === tab.value
                  ? 'bg-primary text-white border-primary shadow-plum-sm'
                  : 'bg-white text-muted-foreground border-transparent hover:bg-[#faedf5] hover:text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <input
            type="text"
            placeholder="Search transfer #, branch, books..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-1.5 border border-[#7e2562]/15 rounded-sm text-xs font-medium text-foreground bg-white focus:outline-none focus:ring-2 focus:ring-[#7e2562]/10 focus:border-primary"
          />
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Main List */}
      {error && (
        <div className="p-4 bg-[#fef5f2] border border-[#fbd5c9] rounded-sm text-danger text-xs font-semibold flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-danger shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-[#7e2562]/15 rounded-sm py-24 flex flex-col items-center justify-center space-y-3 shadow-plum-sm">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-xs font-semibold text-muted-foreground">Loading transfers list...</p>
        </div>
      ) : filteredTransfers.length === 0 ? (
        <div className="bg-white border border-[#7e2562]/15 rounded-sm py-24 text-center space-y-3 shadow-plum-sm">
          <div className="p-3 bg-[#faedf5] rounded-full inline-block">
            <ArrowLeftRight className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground">No stock transfers found</h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-[20rem] mx-auto">
              There are no stock transfer requests matching your query or branch scope.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-[#7e2562]/15 rounded-sm overflow-hidden shadow-plum-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#faf6f9]/60 border-b border-[#7e2562]/10 text-muted-foreground text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-4 whitespace-nowrap">Transfer Number</th>
                  <th className="px-6 py-4 whitespace-nowrap">Source (From)</th>
                  <th className="px-6 py-4 whitespace-nowrap">Destination (To)</th>
                  <th className="px-6 py-4 whitespace-nowrap">Requester</th>
                  <th className="px-6 py-4 whitespace-nowrap">Items count</th>
                  <th className="px-6 py-4 whitespace-nowrap">Status</th>
                  <th className="px-6 py-4 whitespace-nowrap">Requested Date</th>
                  <th className="px-6 py-4 text-center whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#7e2562]/8 text-xs text-foreground">
                {filteredTransfers.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-[#faf6f9]/60 transition duration-150"
                  >
                    <td className="px-6 py-4 font-mono font-bold text-primary whitespace-nowrap">{t.transferNumber}</td>
                    <td className="px-6 py-4 font-semibold text-foreground whitespace-nowrap">{t.fromBranch.name}</td>
                    <td className="px-6 py-4 font-semibold text-foreground whitespace-nowrap">{t.toBranch.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{t.requestedBy?.name || 'BMS Staff'}</td>
                    <td className="px-6 py-4 font-semibold whitespace-nowrap">{t.items?.length || 0} books</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 border text-xs font-bold rounded-full ${getStatusBadge(t.status)}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground whitespace-nowrap">
                      <div className="flex items-center space-x-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          {new Date(t.createdAt).toLocaleDateString(undefined, { dateStyle: 'short' })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleRowClick(t.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-primary bg-[#faedf5] border border-primary/20 hover:bg-primary hover:text-white active:scale-95 rounded-sm transition shadow-2xs cursor-pointer"
                        title="View transfer details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Details</span>
                      </button>
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
