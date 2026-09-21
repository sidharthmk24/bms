"use client";

import { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  Search,
  Bell,
  Check,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  PackagePlus,
  Sparkles,
  Eye,
  Sliders,
  X,
  BookOpen,
  DollarSign,
  Tag,
  Building2,
  User as UserIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApiData } from '@/hooks/useApiData';
import { Dropdown } from '@/components/Dropdown';
import { Pagination } from '@/components/Pagination';

function BranchInventoryInner() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const searchParams = useSearchParams();
  const urlBranchId = searchParams.get('branchId') || searchParams.get('branch') || '';

  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Publisher Type Filter State
  type PublisherFilter = 'ALL' | 'KAIRALI' | 'OTHER';
  const [publisherFilter, setPublisherFilter] = useState<PublisherFilter>('ALL');

  // Sorting State
  type SortField = 'title' | 'quantity' | 'reorderThreshold' | 'status';
  type SortDirection = 'asc' | 'desc';
  const [sortField, setSortField] = useState<SortField>('title');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'quantity' || field === 'reorderThreshold' ? 'desc' : 'asc');
    }
  };

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  // Notification states
  const [notifiedItems, setNotifiedItems] = useState<Record<string, boolean>>({});

  // Branch Selection (For Super Admins, Admins, and Central Inventory Managers)
  const isGlobalAdmin =
    ['SUPER_ADMIN', 'ADMIN', 'CENTRAL_INVENTORY_MANAGER'].some((role) =>
      (user?.roles || []).includes(role) || user?.role === role || user?.primaryRole === role
    );
  const [selectedBranchId, setSelectedBranchId] = useState<string>(urlBranchId || user?.branchId || '');

  // Keep selectedBranchId in sync if URL parameter changes
  useEffect(() => {
    if (urlBranchId && urlBranchId !== selectedBranchId) {
      setSelectedBranchId(urlBranchId);
    }
  }, [urlBranchId]);

  const { data: branchesResponse } = useApiData<any>('/branches', []);
  const branches = branchesResponse?.items || (Array.isArray(branchesResponse) ? branchesResponse : []);
  const storeBranches = branches.filter(
    (b: any) => b.type !== 'WAREHOUSE' && b.code !== 'WH-01' && !b.name?.toLowerCase().includes('warehouse')
  );
  const branchName = branches.find((b: any) => b.id === (selectedBranchId || user?.branchId))?.name || 'Branch';

  // Auto-select first store branch for chain-wide roles if not already set
  useEffect(() => {
    if (storeBranches.length > 0 && !selectedBranchId && isGlobalAdmin && !urlBranchId) {
      setSelectedBranchId(storeBranches[0].id);
    }
  }, [storeBranches, selectedBranchId, isGlobalAdmin, urlBranchId]);

  // Modal State - Set Alert Threshold
  const [thresholdItem, setThresholdItem] = useState<any>(null);
  const [newThreshold, setNewThreshold] = useState<number>(5);
  const [isUpdatingThreshold, setIsUpdatingThreshold] = useState(false);

  // Modal State - View Book Details
  const [viewingDetailsItem, setViewingDetailsItem] = useState<any>(null);

  // Modal State - Request Stock from Central Warehouse
  const [isRequestingStock, setIsRequestingStock] = useState(false);
  const { data: catalog } = useApiData<any>(isRequestingStock ? '/catalog/books?limit=100' : null, []);
  const [requestStockBook, setRequestStockBook] = useState<any>(null);
  const [requestStockQuantity, setRequestStockQuantity] = useState(10);
  const [transferNote, setTransferNote] = useState('');
  const [isSubmittingStockRequest, setIsSubmittingStockRequest] = useState(false);

  const fetchInventory = async () => {
    if (!selectedBranchId) {
      setLoading(false);
      if (!isGlobalAdmin) {
        setError('No branch context found. You must be assigned to a branch to view branch inventory.');
      }
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.append('page', String(currentPage));
      params.append('limit', String(pageSize));
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      if (publisherFilter !== 'ALL') params.append('publisherFilter', publisherFilter);
      params.append('sortField', sortField);
      params.append('sortDirection', sortDirection);

      const res = await api.get(`/inventory/branch/${selectedBranchId}?${params.toString()}`);
      if (res.success) {
        const items = res.data?.items || (Array.isArray(res.data) ? res.data : []);
        setInventory(items);
        setTotalCount(res.data?.total ?? items.length);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [selectedBranchId, currentPage, pageSize, searchTerm, publisherFilter, sortField, sortDirection]);

  useEffect(() => {
    window.addEventListener('app:data-mutated', fetchInventory);
    return () => window.removeEventListener('app:data-mutated', fetchInventory);
  }, [selectedBranchId, currentPage, pageSize, searchTerm, publisherFilter, sortField, sortDirection]);

  // Handle Update Alert Threshold
  const handleUpdateThreshold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!thresholdItem || !selectedBranchId) return;

    try {
      setIsUpdatingThreshold(true);
      await api.patch(
        `/inventory/branches/${selectedBranchId}/inventory/${thresholdItem.book.id}/threshold`,
        { threshold: newThreshold }
      );
      setThresholdItem(null);
      fetchInventory();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update threshold');
    } finally {
      setIsUpdatingThreshold(false);
    }
  };

  const handleRequestStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const bookId = requestStockBook?.id;
    if (!bookId || requestStockQuantity <= 0) return;
    if (!selectedBranchId) {
      alert('Destination branch is required. Please select a branch first.');
      return;
    }

    const ok = await confirm({
      title: 'Create Stock Transfer Request',
      message: `Create a stock transfer for ${requestStockQuantity} unit(s) of "${requestStockBook.title}" to ${branchName}?`,
      confirmText: 'Yes, Create Transfer',
      cancelText: 'No, Cancel',
      variant: 'primary',
    });
    if (!ok) return;

    try {
      setIsSubmittingStockRequest(true);
      const payloadNote =
        transferNote.trim() ||
        `Stock transfer request for "${requestStockBook.title}" (${requestStockQuantity} units) to ${branchName}`;

      const res = await api.post('/transfers', {
        toBranchId: selectedBranchId,
        items: [{ bookId, quantity: requestStockQuantity }],
        note: payloadNote,
      });

      if (res.success || res.data) {
        const transferNum = res.data?.transferNumber || '';
        setNotifiedItems((prev) => ({ ...prev, [bookId]: true }));
        setIsRequestingStock(false);
        setTransferNote('');
        alert(
          `Stock transfer ${transferNum ? `[${transferNum}] ` : ''}created successfully!\nDestination: ${branchName}\nQuantity: ${requestStockQuantity} copies of "${requestStockBook.title}"`
        );
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to create stock transfer');
    } finally {
      setIsSubmittingStockRequest(false);
    }
  };

  if (loading && inventory.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#7e2562]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#fef5f2] text-[#e45e34] border border-[#e45e34]/20 p-4 rounded-sm flex items-center font-medium text-xs">
        <AlertCircle className="w-4 h-4 mr-2 text-[#e45e34]" />
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-sm border border-[#7e2562]/15 shadow-2xs">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-neutral-900">
            {isGlobalAdmin ? 'Branch Inventory' : `${branchName} Inventory`}
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Monitor branch stock balances, low-stock threshold triggers, and stock transfer requests.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {/* Branch Selector for Admins */}
          {isGlobalAdmin && (
            <div className="w-full sm:w-64">
              <Dropdown
                value={selectedBranchId}
                onChange={(val) => {
                  setSelectedBranchId(val);
                  setCurrentPage(1);
                }}
                placeholder="Select Store Branch..."
                options={storeBranches.map((b: any) => ({
                  value: b.id,
                  label: b.name,
                  sublabel: `${b.code} • ${b.city || 'Store'}`,
                }))}
              />
            </div>
          )}

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search title, author, barcode..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-[#7e2562] focus:border-[#7e2562]"
            />
          </div>

          {selectedBranchId && (
            <button
              onClick={() => {
                setRequestStockBook(null);
                setRequestStockQuantity(10);
                setIsRequestingStock(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#7e2562] hover:bg-[#681b50] rounded-sm shadow-sm shadow-plum-sm transition-all shrink-0 cursor-pointer active:scale-95"
            >
              <TrendingUp className="w-4 h-4" />
              Request Restock
            </button>
          )}
        </div>
      </div>

      {!selectedBranchId && isGlobalAdmin && (
        <div className="bg-[#faf6f9]/60 border border-[#7e2562]/15 text-neutral-800 px-4 py-12 rounded-sm text-center flex flex-col items-center">
          <Search className="w-12 h-12 text-[#7e2562]/40 mb-3" />
          <h3 className="text-base font-bold text-neutral-900">Select a Branch</h3>
          <p className="text-xs mt-1 max-w-md text-neutral-500">
            Please select a branch from the dropdown menu above to view and manage its inventory.
          </p>
        </div>
      )}

      {selectedBranchId && (
        <div className="space-y-4">
          {/* Publisher Type Filter Tabs */}
          <div className="flex items-center gap-2 p-1 bg-white rounded-sm w-fit border border-[#7e2562]/15 shadow-2xs">
            <button
              onClick={() => {
                setPublisherFilter('ALL');
                setCurrentPage(1);
              }}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-sm transition-all cursor-pointer ${
                publisherFilter === 'ALL'
                  ? 'bg-[#7e2562] text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              All Books{publisherFilter === 'ALL' ? ` (${totalCount || inventory.length})` : ''}
            </button>
            <button
              onClick={() => {
                setPublisherFilter('KAIRALI');
                setCurrentPage(1);
              }}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-sm transition-all flex items-center gap-1.5 cursor-pointer ${
                publisherFilter === 'KAIRALI'
                  ? 'bg-[#7e2562] text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Kairali Books{publisherFilter === 'KAIRALI' ? ` (${totalCount})` : ''}</span>
            </button>
            <button
              onClick={() => {
                setPublisherFilter('OTHER');
                setCurrentPage(1);
              }}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-sm transition-all cursor-pointer ${
                publisherFilter === 'OTHER'
                  ? 'bg-[#7e2562] text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Other Publishers{publisherFilter === 'OTHER' ? ` (${totalCount})` : ''}
            </button>
          </div>

          {/* Inventory Table */}
          <div className="bg-white shadow-2xs border border-[#7e2562]/15 rounded-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-100">
                <thead className="bg-[#faf6f9] border-b border-[#7e2562]/10 text-xs font-bold text-neutral-700">
                  <tr>
                    <th
                      scope="col"
                      onClick={() => toggleSort('title')}
                      className="px-6 py-3.5 text-left cursor-pointer select-none hover:text-[#7e2562] transition-colors whitespace-nowrap"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Book Title & Author</span>
                        {sortField === 'title' ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-[#7e2562] font-bold" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-[#7e2562] font-bold" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-neutral-400 opacity-60" />
                        )}
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-left whitespace-nowrap">
                      ISBN / Barcode
                    </th>
                    <th
                      scope="col"
                      onClick={() => toggleSort('quantity')}
                      className="px-6 py-3.5 text-right cursor-pointer select-none hover:text-[#7e2562] transition-colors whitespace-nowrap"
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Quantity In Stock</span>
                        {sortField === 'quantity' ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-[#7e2562] font-bold" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-[#7e2562] font-bold" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-neutral-400 opacity-60" />
                        )}
                      </div>
                    </th>
                    <th
                      scope="col"
                      onClick={() => toggleSort('status')}
                      className="px-6 py-3.5 text-center cursor-pointer select-none hover:text-[#7e2562] transition-colors whitespace-nowrap"
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>Status & Reorder Alert</span>
                        {sortField === 'status' ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-[#7e2562] font-bold" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-[#7e2562] font-bold" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-neutral-400 opacity-60" />
                        )}
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-right whitespace-nowrap">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-100 text-xs">
                  {inventory.map((item) => {
                    const isLowStock = item.quantity <= item.reorderThreshold;
                    const isNotified = !!notifiedItems[item.book?.id];
                    const isKairali =
                      item.book?.publishType === 'KAIRALI_BOOKS' ||
                      item.book?.publisher?.name?.toLowerCase().includes('kairali') ||
                      Boolean(item.book?.pmsTitleId);

                    return (
                      <tr key={item.id} className="hover:bg-[#faf6f9]/50 transition-colors">
                        <td className="px-6 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-neutral-900">{item.book.title}</span>
                            {isKairali ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#eaf8f1] text-[#3cb976] border border-[#3cb976]/30">
                                Kairali Books
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-100 text-neutral-600 border border-neutral-200">
                                {item.book.publisher?.name || 'Other'}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-neutral-500 mt-0.5">
                            {item.book.author?.name || 'Author N/A'}
                          </div>
                        </td>

                        <td className="px-6 py-3.5 whitespace-nowrap font-mono text-neutral-500 text-[11px]">
                          {item.book.barcode || item.book.isbn || 'N/A'}
                        </td>

                        <td className="px-6 py-3.5 whitespace-nowrap text-right font-extrabold text-sm text-neutral-900">
                          {item.quantity}
                        </td>

                        <td className="px-6 py-3.5 whitespace-nowrap text-center">
                          <div className="flex flex-col items-center justify-center gap-1">
                            {item.quantity === 0 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#fef2f2] text-[#e45e34] border border-[#e45e34]/30">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#e45e34] animate-pulse"></span>
                                Out of Stock (0)
                              </span>
                            ) : isLowStock ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#fffbeb] text-amber-800 border border-amber-300">
                                Low Stock (≤{item.reorderThreshold})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#eaf8f1] text-[#3cb976] border border-[#3cb976]/30">
                                In Stock (Alert ≤{item.reorderThreshold})
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-3.5 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* 1. Request Stock Button */}
                            <button
                              onClick={() => {
                                setRequestStockBook(item.book);
                                setRequestStockQuantity(Math.max(10, (item.reorderThreshold || 5) * 2));
                                setIsRequestingStock(true);
                              }}
                              disabled={isNotified}
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-sm border transition-all cursor-pointer active:scale-95 ${
                                isNotified
                                  ? 'bg-neutral-100 text-neutral-500 border-neutral-300'
                                  : 'bg-[#7e2562] text-white hover:bg-[#681b50] border-[#7e2562] shadow-2xs shadow-plum-sm'
                              }`}
                              title="Request replenishment from Central Warehouse"
                            >
                              {isNotified ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600 font-bold" />
                                  <span>Requested</span>
                                </>
                              ) : (
                                <>
                                  <TrendingUp className="w-3.5 h-3.5" />
                                  <span>Request Stock</span>
                                </>
                              )}
                            </button>

                            {/* 2. Set Alert Threshold Button */}
                            <button
                              onClick={() => {
                                setThresholdItem(item);
                                setNewThreshold(item.reorderThreshold ?? 5);
                              }}
                              className="p-1.5 text-neutral-600 hover:text-[#7e2562] hover:bg-[#faedf5] border border-neutral-200 rounded-sm transition-colors cursor-pointer"
                              title="Configure Low Stock Alert Threshold"
                            >
                              <Bell className="w-3.5 h-3.5" />
                            </button>

                            {/* 3. View Book Details Button */}
                            <button
                              onClick={() => setViewingDetailsItem(item)}
                              className="p-1.5 text-neutral-600 hover:text-[#7e2562] hover:bg-[#faedf5] border border-neutral-200 rounded-sm transition-colors cursor-pointer"
                              title="View Catalog Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {inventory.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-neutral-500 text-xs">
                        No inventory records found matching your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalItems={totalCount}
              pageSize={pageSize}
              onPageChange={(page) => setCurrentPage(page)}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
      )}

      {/* 1. SET ALERT THRESHOLD MODAL */}
      <AnimatePresence>
        {thresholdItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-sm shadow-2xl border border-[#7e2562]/25 w-full max-w-md p-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-sm bg-[#faedf5] text-[#7e2562] flex items-center justify-center">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900">Set Reorder Alert Threshold</h3>
                    <p className="text-[11px] text-neutral-500">Configure low-stock alert level for this branch</p>
                  </div>
                </div>
                <button
                  onClick={() => setThresholdItem(null)}
                  className="p-1 text-neutral-400 hover:text-neutral-700 rounded-sm"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleUpdateThreshold} className="space-y-4 mt-4">
                <div className="p-3 bg-neutral-50 rounded-sm border border-neutral-100 text-xs">
                  <div className="font-bold text-neutral-900 line-clamp-1">{thresholdItem.book?.title}</div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">
                    Current Quantity: <span className="font-bold text-neutral-800">{thresholdItem.quantity} units</span> • Current Threshold: <span className="font-bold text-[#7e2562]">{thresholdItem.reorderThreshold}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    New Alert Threshold (Units)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10000"
                    required
                    value={newThreshold}
                    onChange={(e) => setNewThreshold(Math.max(0, Number(e.target.value)))}
                    className="block w-full px-3 py-2 border border-neutral-300 rounded-sm text-sm font-bold focus:outline-none focus:ring-1 focus:ring-[#7e2562] focus:border-[#7e2562]"
                    placeholder="e.g. 5"
                  />
                  <p className="text-[11px] text-neutral-500 mt-1">
                    When in-stock copies fall to or below this count, a Low-Stock alert is triggered.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => setThresholdItem(null)}
                    className="px-4 py-2 text-xs font-bold text-neutral-700 bg-white border border-neutral-300 rounded-sm hover:bg-neutral-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingThreshold}
                    className="flex items-center px-4 py-2 text-xs font-bold text-white bg-[#7e2562] rounded-sm hover:bg-[#681b50] disabled:opacity-50 transition-colors shadow-sm shadow-plum-sm cursor-pointer"
                  >
                    {isUpdatingThreshold && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                    Save Threshold
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. VIEW BOOK DETAILS MODAL */}
      <AnimatePresence>
        {viewingDetailsItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-sm shadow-2xl border border-[#7e2562]/25 w-full max-w-lg p-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-sm bg-[#faedf5] text-[#7e2562] flex items-center justify-center">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900">Book Catalog Specifications</h3>
                    <p className="text-[11px] text-neutral-500">Metadata and stock position</p>
                  </div>
                </div>
                <button
                  onClick={() => setViewingDetailsItem(null)}
                  className="p-1 text-neutral-400 hover:text-neutral-700 rounded-sm"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 mt-4 text-xs">
                <div className="p-3.5 bg-gradient-to-r from-[#faf6f9] to-white rounded-sm border border-[#7e2562]/15">
                  <h4 className="text-base font-extrabold text-neutral-900">
                    {viewingDetailsItem.book?.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-1 text-neutral-600">
                    <UserIcon className="w-3.5 h-3.5 text-[#7e2562]" />
                    <span>Author: <strong>{viewingDetailsItem.book?.author?.name || 'N/A'}</strong></span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2.5 bg-neutral-50 rounded-sm border border-neutral-200">
                    <span className="text-[10px] font-bold uppercase text-neutral-400 block">Retail Price</span>
                    <span className="text-sm font-extrabold text-[#7e2562]">
                      ₹{Number(viewingDetailsItem.book?.price || 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="p-2.5 bg-neutral-50 rounded-sm border border-neutral-200">
                    <span className="text-[10px] font-bold uppercase text-neutral-400 block">Current In-Stock</span>
                    <span className="text-sm font-extrabold text-neutral-900">
                      {viewingDetailsItem.quantity} units
                    </span>
                  </div>

                  <div className="p-2.5 bg-neutral-50 rounded-sm border border-neutral-200">
                    <span className="text-[10px] font-bold uppercase text-neutral-400 block">Reorder Alert Level</span>
                    <span className="text-xs font-bold text-neutral-800">
                      ≤ {viewingDetailsItem.reorderThreshold} units
                    </span>
                  </div>

                  <div className="p-2.5 bg-neutral-50 rounded-sm border border-neutral-200">
                    <span className="text-[10px] font-bold uppercase text-neutral-400 block">Publisher</span>
                    <span className="text-xs font-bold text-neutral-800 truncate block">
                      {viewingDetailsItem.book?.publisher?.name || 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-neutral-100 text-neutral-600 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">ISBN:</span>
                    <span className="font-mono font-bold text-neutral-800">{viewingDetailsItem.book?.isbn || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Barcode:</span>
                    <span className="font-mono font-bold text-neutral-800">{viewingDetailsItem.book?.barcode || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Publisher Type:</span>
                    <span className="font-bold text-neutral-800">{viewingDetailsItem.book?.publishType || 'COMMERCIAL'}</span>
                  </div>
                </div>

                <div className="flex justify-end pt-3 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => setViewingDetailsItem(null)}
                    className="px-4 py-2 text-xs font-bold text-neutral-700 bg-white border border-neutral-300 rounded-sm hover:bg-neutral-50 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. REQUEST STOCK TRANSFER MODAL */}
      <AnimatePresence>
        {isRequestingStock && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-sm shadow-2xl border border-[#7e2562]/25 w-full max-w-lg p-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-sm bg-[#faedf5] text-[#7e2562] flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900">Request Stock Transfer</h3>
                    <p className="text-[11px] text-neutral-500">
                      Create transfer order from Central Warehouse to {branchName}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsRequestingStock(false)}
                  className="p-1 text-neutral-400 hover:text-neutral-700 rounded-sm cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleRequestStockSubmit} className="space-y-4 mt-4 text-xs">
                {/* Branch Route Summary */}
                <div className="p-3 bg-[#faf6f9]/80 rounded-sm border border-[#7e2562]/15 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-neutral-400 block">Destination Branch</span>
                    <span className="text-xs font-extrabold text-[#7e2562] flex items-center gap-1 mt-0.5">
                      <Building2 className="w-3.5 h-3.5" />
                      {branchName}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase text-neutral-400 block">Source Warehouse</span>
                    <span className="text-xs font-bold text-neutral-700">Central Warehouse (WH-01)</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Select Book Title</label>
                  {requestStockBook ? (
                    <div className="p-3 bg-white rounded-sm border border-[#7e2562]/30 flex items-center justify-between shadow-2xs">
                      <div>
                        <div className="text-xs font-bold text-neutral-900">{requestStockBook.title}</div>
                        <div className="text-[11px] text-neutral-500 mt-0.5">
                          {requestStockBook.author?.name || 'Author N/A'} • ISBN: {requestStockBook.isbn || 'N/A'}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRequestStockBook(null)}
                        className="text-xs text-[#7e2562] hover:underline font-bold ml-2 cursor-pointer"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <Dropdown
                      searchable
                      value={requestStockBook?.id || ''}
                      onChange={(val) => {
                        const bookList =
                          catalog?.books || catalog?.items || catalog?.data || (Array.isArray(catalog) ? catalog : []);
                        const b = bookList.find((item: any) => item.id === val);
                        setRequestStockBook(b || null);
                      }}
                      placeholder="Search books by title, author, ISBN..."
                      options={(
                        catalog?.books ||
                        catalog?.items ||
                        catalog?.data ||
                        (Array.isArray(catalog) ? catalog : [])
                      ).map((b: any) => ({
                        value: b.id,
                        label: b.title,
                        sublabel: `${b.author?.name || ''} • ISBN: ${b.isbn || 'N/A'}`,
                      }))}
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Quantity to Transfer (Units) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={requestStockQuantity}
                    onChange={(e) => setRequestStockQuantity(Math.max(1, Number(e.target.value)))}
                    className="block w-full px-3 py-2 border border-neutral-300 rounded-sm text-sm font-bold focus:outline-none focus:ring-1 focus:ring-[#7e2562] focus:border-[#7e2562]"
                    placeholder="e.g. 10"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Transfer Note (Optional)
                  </label>
                  <input
                    type="text"
                    value={transferNote}
                    onChange={(e) => setTransferNote(e.target.value)}
                    className="block w-full px-3 py-2 border border-neutral-300 rounded-sm text-xs focus:outline-none focus:ring-1 focus:ring-[#7e2562] focus:border-[#7e2562]"
                    placeholder={`e.g. Stock replenishment for ${branchName}`}
                  />
                  <p className="text-[11px] text-neutral-500 mt-1">
                    A Pending Stock Transfer order will be recorded and queued for warehouse dispatch.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => setIsRequestingStock(false)}
                    className="px-4 py-2 text-xs font-bold text-neutral-700 bg-white border border-neutral-300 rounded-sm hover:bg-neutral-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingStockRequest || !requestStockBook?.id || requestStockQuantity <= 0}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#7e2562] rounded-sm hover:bg-[#681b50] disabled:opacity-50 transition-colors shadow-sm shadow-plum-sm cursor-pointer"
                  >
                    {isSubmittingStockRequest ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                        <span>Creating Transfer...</span>
                      </>
                    ) : (
                      <>
                        <TrendingUp className="w-3.5 h-3.5 text-white" />
                        <span>Create Stock Transfer</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function BranchInventoryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-[#7e2562]" />
        </div>
      }
    >
      <BranchInventoryInner />
    </Suspense>
  );
}
