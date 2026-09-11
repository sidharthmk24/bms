"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import { api } from '@/lib/api';
import { Loader2, AlertCircle, Search, Edit2, Bell, Check, ArrowUpDown, ArrowUp, ArrowDown, TrendingUp, PackagePlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApiData } from '@/hooks/useApiData';
import { Dropdown } from '@/components/Dropdown';
import { Pagination } from '@/components/Pagination';
import { matchKeywords } from '@/lib/searchUtils';

export default function BranchInventoryPage() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const canAdjust = ['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER', 'BRANCH_INVENTORY'].includes(user?.role || user?.primaryRole || '');
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
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
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
  const [notifyingId, setNotifyingId] = useState<string | null>(null);
  const [notifiedItems, setNotifiedItems] = useState<Record<string, boolean>>({});

  // Branch Selection (For Admins)
  const isGlobalAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(user?.role || user?.primaryRole || '') && !user?.branchId;
  const [selectedBranchId, setSelectedBranchId] = useState<string>(user?.branchId || '');
  const { data: branchesResponse } = useApiData<any>('/branches', []);
  const branches = branchesResponse?.items || (Array.isArray(branchesResponse) ? branchesResponse : []);
  const branchName = branches.find((b: any) => b.id === user?.branchId)?.name || 'Branch';

  // Modal State - Adjust Inventory
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [adjustmentQuantity, setAdjustmentQuantity] = useState(0);
  const [adjustmentReason, setAdjustmentReason] = useState('CORRECTION');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal State - Request Stock from Central Warehouse
  const [isRequestingStock, setIsRequestingStock] = useState(false);
  const [requestStockBook, setRequestStockBook] = useState<any>(null);
  const [requestStockQuantity, setRequestStockQuantity] = useState(10);
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

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBook || !selectedBranchId) return;

    const formattedQty = adjustmentQuantity > 0 ? `+${adjustmentQuantity}` : `${adjustmentQuantity}`;
    const ok = await confirm({
      title: "Confirm Stock Adjustment",
      message: `Are you sure you want to adjust the inventory quantity for "${selectedBook.book.title}" by ${formattedQty}? Reason: "${adjustmentReason}".`,
      confirmText: "Yes, Adjust Stock",
      cancelText: "No, Cancel",
      variant: "warning",
    });
    if (!ok) return;

    try {
      setIsSubmitting(true);
      await api.post(`/inventory/branch/${selectedBranchId}/book/${selectedBook.book.id}/adjust`, {
        quantity: adjustmentQuantity,
        reason: adjustmentReason,
      });
      setIsAdjusting(false);
      fetchInventory();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Adjustment failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNotifyManager = async (item: any) => {
    if (!selectedBranchId || !item.book?.id) return;

    const ok = await confirm({
      title: "Send Low-Stock Notification",
      message: `Are you sure you want to send a low-stock alert for "${item.book?.title}" to the Central Inventory Manager and administrators?`,
      confirmText: "Yes, Send Alert",
      cancelText: "No, Cancel",
      variant: "primary",
    });
    if (!ok) return;

    try {
      setNotifyingId(item.id);
      const res = await api.post(`/inventory/branch/${selectedBranchId}/book/${item.book.id}/notify-manager`, {});
      if (res.success) {
        setNotifiedItems(prev => ({ ...prev, [item.id]: true }));
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to notify manager');
    } finally {
      setNotifyingId(null);
    }
  };

  const handleRequestStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const bookId = requestStockBook?.id;
    if (!bookId || requestStockQuantity <= 0) return;

    const ok = await confirm({
      title: "Submit Restock Request",
      message: `Are you sure you want to request ${requestStockQuantity} copies of "${requestStockBook.title}" from the Central Warehouse?`,
      confirmText: "Yes, Submit Request",
      cancelText: "No, Cancel",
      variant: "primary",
    });
    if (!ok) return;

    try {
      setIsSubmittingStockRequest(true);
      // 1. Submit restock request to central inventory
      await api.post('/restock', {
        items: [{ bookId, quantity: requestStockQuantity }]
      });

      // 2. Also trigger notifications to Central Inventory Manager & Admins
      if (selectedBranchId) {
        await api.post(`/inventory/branch/${selectedBranchId}/book/${bookId}/notify-manager`, {}).catch(() => {});
      }

      setNotifiedItems(prev => ({ ...prev, [bookId]: true }));
      setIsRequestingStock(false);
      alert(`Stock request for "${requestStockBook.title}" (${requestStockQuantity} copies) successfully submitted to Central Warehouse!`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit stock request');
    } finally {
      setIsSubmittingStockRequest(false);
    }
  };

  if (loading && inventory.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-black" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-neutral-100 text-black border border-neutral-300 p-4 rounded-xl flex items-center">
        <AlertCircle className="w-5 h-5 mr-2 text-black" />
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-black">
            {isGlobalAdmin ? "Branch Inventory" : `${branchName} Inventory`}
          </h2>
          <p className="text-sm text-neutral-500">Manage local stock levels, alerts, and adjustments.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
          {/* Branch Selector for Admins */}
          {isGlobalAdmin && (
            <div className="w-full sm:w-64">
              <Dropdown
                value={selectedBranchId}
                onChange={(val) => {
                  setSelectedBranchId(val);
                  setCurrentPage(1);
                }}
                placeholder="Select a branch..."
                options={branches
                  .filter((b: any) => b.isActive !== false && b.type !== 'WAREHOUSE' && b.name?.toLowerCase() !== 'central warehouse')
                  .map((b: any) => ({
                    value: b.id,
                    label: b.name
                  }))}
              />
            </div>
          )}

          {/* Search Bar */}
          <div className="relative w-full sm:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-muted-foreground" />
            </div>
            <input
              type="text"
              placeholder="Search title, author, ISBN, barcode, keywords..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="block w-full pl-10 pr-3 py-2 border border-[#7e2562]/15 rounded-sm focus:ring-[#7e2562]/10 focus:border-[#7e2562] text-xs font-medium text-foreground bg-white outline-none"
            />
          </div>

          {/* Sorting Dropdown */}
          <div className="w-full sm:w-48 shrink-0">
            <Dropdown
              value={`${sortField}_${sortDirection}`}
              onChange={(val) => {
                const [f, d] = val.split('_') as [SortField, SortDirection];
                setSortField(f);
                setSortDirection(d);
              }}
              options={[
                { value: 'title_asc', label: 'Title: A-Z' },
                { value: 'title_desc', label: 'Title: Z-A' },
                { value: 'quantity_desc', label: 'Qty: High-Low' },
                { value: 'quantity_asc', label: 'Qty: Low-High' },
                { value: 'status_asc', label: 'Needs Restock First' },
                { value: 'reorderThreshold_desc', label: 'Threshold: High-Low' },
              ]}
              selectClassName="!py-2 !rounded-sm !text-xs font-bold border-[#7e2562]/15 bg-white"
            />
          </div>

          {selectedBranchId && (
            <button
              onClick={() => {
                setRequestStockBook(null);
                setRequestStockQuantity(10);
                setIsRequestingStock(true);
              }}
              className="apple-button inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-sm shadow-plum-sm transition-all shrink-0 cursor-pointer"
            >
              <TrendingUp className="w-4 h-4" />
              Request Stock
            </button>
          )}
        </div>
      </div>

      {!selectedBranchId && isGlobalAdmin && (
        <div className="bg-[#faf6f9]/60 border border-[#7e2562]/15 text-foreground px-4 py-8 rounded-sm text-center flex flex-col items-center">
          <Search className="w-12 h-12 text-[#7e2562]/40 mb-3" />
          <h3 className="text-lg font-bold text-foreground">Select a Branch</h3>
          <p className="text-xs mt-1 max-w-md text-muted-foreground">Please select a branch from the dropdown menu above to view and manage its inventory.</p>
        </div>
      )}

      {selectedBranchId && (
        <div className="space-y-4">
          {/* Publisher Type Filter Tabs */}
          <div className="flex items-center gap-2 p-1 bg-white rounded-sm w-fit border border-[#7e2562]/15 shadow-2xs">
            <button
              onClick={() => { setPublisherFilter('ALL'); setCurrentPage(1); }}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-sm transition-all cursor-pointer ${
                publisherFilter === 'ALL'
                  ? 'bg-primary text-white shadow-plum-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All Books ({inventory.length})
            </button>
            <button
              onClick={() => { setPublisherFilter('KAIRALI'); setCurrentPage(1); }}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-sm transition-all flex items-center gap-1.5 cursor-pointer ${
                publisherFilter === 'KAIRALI'
                  ? 'bg-[#3cb976] text-white shadow-xs'
                  : 'text-[#22794d] hover:text-[#1b4f35]'
              }`}
            >
              <span>🌟</span>
              <span>Kairali Books ({inventory.filter((i: any) => i.book?.publishType === 'KAIRALI_BOOKS' || i.book?.publisher?.name?.toLowerCase().includes('kairali') || Boolean(i.book?.pmsTitleId)).length})</span>
            </button>
            <button
              onClick={() => { setPublisherFilter('OTHER'); setCurrentPage(1); }}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-sm transition-all cursor-pointer ${
                publisherFilter === 'OTHER'
                  ? 'bg-primary text-white shadow-plum-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Other Publishers ({inventory.filter((i: any) => !(i.book?.publishType === 'KAIRALI_BOOKS' || i.book?.publisher?.name?.toLowerCase().includes('kairali') || Boolean(i.book?.pmsTitleId))).length})
            </button>
          </div>

          <div className="bg-white shadow-plum-sm border border-[#7e2562]/15 rounded-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#7e2562]/8">
              <thead className="bg-[#faf6f9]/60 border-b border-[#7e2562]/10">
                <tr>
                  <th 
                    scope="col" 
                    onClick={() => toggleSort('title')}
                    className="group px-6 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider cursor-pointer select-none hover:text-foreground transition-colors whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Book</span>
                      {sortField === 'title' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-primary font-bold" /> : <ArrowDown className="w-3.5 h-3.5 text-primary font-bold" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-muted-foreground/50 opacity-50 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">ISBN / Barcode</th>
                  <th 
                    scope="col" 
                    onClick={() => toggleSort('quantity')}
                    className="group px-6 py-3 text-right text-xs font-bold text-muted-foreground uppercase tracking-wider cursor-pointer select-none hover:text-foreground transition-colors whitespace-nowrap"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Quantity</span>
                      {sortField === 'quantity' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-primary font-bold" /> : <ArrowDown className="w-3.5 h-3.5 text-primary font-bold" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-muted-foreground/50 opacity-50 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    onClick={() => toggleSort('status')}
                    className="group px-6 py-3 text-center text-xs font-bold text-muted-foreground uppercase tracking-wider cursor-pointer select-none hover:text-foreground transition-colors whitespace-nowrap"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Status & Alerts</span>
                      {sortField === 'status' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-primary font-bold" /> : <ArrowDown className="w-3.5 h-3.5 text-primary font-bold" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-muted-foreground/50 opacity-50 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-[#7e2562]/8">
                {inventory.map((item) => {
                  const isLowStock = item.quantity <= item.reorderThreshold;
                  const isNotified = !!notifiedItems[item.id];
                  const isCurrentlyNotifying = notifyingId === item.id;
                  const isKairali = 
                    item.book?.publishType === 'KAIRALI_BOOKS' || 
                    item.book?.publisher?.name?.toLowerCase().includes('kairali') || 
                    Boolean(item.book?.pmsTitleId);

                  return (
                    <tr key={item.id} className="hover:bg-[#faf6f9]/60 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{item.book.title}</span>
                          {isKairali ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#f0fbf5] text-[#22794d] border border-[#bcecd2]">
                              Kairali Books
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#faf6f9] text-muted-foreground border border-[#ece3ea]">
                              {item.book.publisher?.name || 'Other'}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">{item.book.author?.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-muted-foreground font-mono">
                        {item.book.barcode || item.book.isbn}
                      </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-foreground">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        {item.quantity === 0 ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#fef5f2] text-danger border border-[#fbd5c9] shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse"></span>
                            Out of Stock (0)
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#fffbeb] text-amber-800 border border-[#fde68a] shadow-2xs">
                            Low Stock (≤{item.reorderThreshold})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#f0fbf5] text-[#22794d] border border-[#bcecd2] shadow-2xs">
                            In Stock
                          </span>
                        )}

                        {/* Request Stock Option for Low Stock or Out of Stock */}
                        {(isLowStock || item.quantity === 0) && (
                          <button
                            onClick={() => {
                              setRequestStockBook(item.book);
                              setRequestStockQuantity(Math.max(10, (item.reorderThreshold || 5) * 2));
                              setIsRequestingStock(true);
                            }}
                            disabled={isNotified}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all duration-150 ${
                              isNotified
                                ? 'bg-neutral-100 text-black border-neutral-300 cursor-default'
                                : 'bg-black text-white hover:bg-neutral-900 border-neutral-800 shadow-sm active:scale-95'
                            }`}
                            title="Request stock from Central Warehouse"
                          >
                            {isNotified ? (
                              <>
                                <Check className="w-3 h-3 text-black" />
                                <span>Requested ✓</span>
                              </>
                            ) : (
                              <>
                                <TrendingUp className="w-3 h-3 text-white" />
                                <span>Request Stock</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {canAdjust && (
                        <button
                          onClick={() => {
                            setSelectedBook(item);
                            setAdjustmentQuantity(0);
                            setAdjustmentReason('CORRECTION');
                            setIsAdjusting(true);
                          }}
                          className="apple-button inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#7e2562] bg-[#faedf5] hover:bg-[#f6dded] border border-[#7e2562]/20 rounded-sm transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Adjust</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {inventory.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-neutral-500 text-sm">
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

      {/* Adjust Inventory Modal */}
      <AnimatePresence>
        {isAdjusting && selectedBook && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-md p-6"
            >
              <h3 className="text-base font-bold text-black mb-1">Adjust Inventory</h3>
              <p className="text-xs text-neutral-600 mb-6">
                {selectedBook.book.title} (Current: {selectedBook.quantity})
              </p>

              <form onSubmit={handleAdjust} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Quantity Change</label>
                  <input
                    type="number"
                    required
                    value={adjustmentQuantity}
                    onChange={(e) => setAdjustmentQuantity(Number(e.target.value))}
                    className="block w-full px-3 py-2 border border-neutral-300 rounded-xl focus:ring-black focus:border-black text-sm"
                    placeholder="e.g. -2 or 5"
                  />
                  <p className="text-[11px] text-neutral-500 mt-1">Use negative values for missing/damaged items.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Reason</label>
                  <Dropdown
                    value={adjustmentReason}
                    onChange={(val) => setAdjustmentReason(val)}
                    options={[
                      { value: 'CORRECTION', label: 'Correction' },
                      { value: 'DAMAGED', label: 'Damaged' },
                      { value: 'LOST', label: 'Lost' },
                      { value: 'SAMPLE', label: 'Sample' },
                      { value: 'RETURNED_TO_SUPPLIER', label: 'Returned to Supplier' }
                    ]}
                  />
                </div>

                <div className="flex justify-end space-x-2.5 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsAdjusting(false)}
                    className="px-4 py-2 text-xs font-semibold text-black bg-white border border-neutral-300 rounded-xl hover:bg-neutral-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || adjustmentQuantity === 0}
                    className="flex items-center px-4 py-2 text-xs font-semibold text-white bg-black rounded-xl hover:bg-neutral-900 disabled:opacity-50 transition-colors"
                  >
                    {isSubmitting && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin text-white" />}
                    Confirm Adjustment
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Request Stock from Central Warehouse Modal */}
      <AnimatePresence>
        {isRequestingStock && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-lg p-6"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="p-2 rounded-xl bg-neutral-100 text-black">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-black">Request Stock</h3>
                  <p className="text-xs text-neutral-500">Request stock replenishment from Central Warehouse</p>
                </div>
              </div>

              <form onSubmit={handleRequestStockSubmit} className="space-y-4 mt-5">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Book</label>
                  {requestStockBook ? (
                    <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold text-black">{requestStockBook.title}</div>
                        <div className="text-xs text-neutral-500">{requestStockBook.author?.name || 'Author N/A'} • ISBN: {requestStockBook.isbn || 'N/A'}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRequestStockBook(null)}
                        className="text-xs text-neutral-500 hover:text-black font-semibold underline ml-2"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <Dropdown
                      searchable
                      value={requestStockBook?.id || ''}
                      onChange={(val) => {
                        const bookList = catalog?.books || catalog?.items || catalog?.data || (Array.isArray(catalog) ? catalog : []);
                        const b = bookList.find((item: any) => item.id === val);
                        setRequestStockBook(b || null);
                      }}
                      placeholder="Search books by title, author, ISBN..."
                      options={(catalog?.books || catalog?.items || catalog?.data || (Array.isArray(catalog) ? catalog : [])).map((b: any) => ({
                        value: b.id,
                        label: b.title,
                        sublabel: `${b.author?.name || ''} • ISBN: ${b.isbn || 'N/A'}`
                      }))}
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Quantity to Request</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={requestStockQuantity}
                    onChange={(e) => setRequestStockQuantity(Math.max(1, Number(e.target.value)))}
                    className="block w-full px-3 py-2 border border-neutral-300 rounded-xl focus:ring-black focus:border-black text-sm font-semibold"
                    placeholder="e.g. 10"
                  />
                  <p className="text-[11px] text-neutral-500 mt-1">
                    Central Inventory Manager, Admin, and Super Admin will be notified to review and dispatch this stock.
                  </p>
                </div>

                {/* <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/80 text-xs text-neutral-600 space-y-1">
                  <div className="font-semibold text-black">Delivery Pipeline:</div>
                  <div>• If Central Warehouse has stock, it will be dispatched to your branch.</div>
                  <div>• If out of stock chain-wide, a Purchase Order will be initiated to restock the central pool.</div>
                </div> */}

                <div className="flex justify-end space-x-2.5 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsRequestingStock(false)}
                    className="px-4 py-2 text-xs font-semibold text-black bg-white border border-neutral-300 rounded-xl hover:bg-neutral-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingStockRequest || !requestStockBook?.id || requestStockQuantity <= 0}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-black rounded-xl hover:bg-neutral-900 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {isSubmittingStockRequest ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <TrendingUp className="w-3.5 h-3.5 text-white" />
                        <span>Submit Stock Request</span>
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
