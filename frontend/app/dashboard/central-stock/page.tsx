"use client";

import { useState } from 'react';
import { useApiData } from '@/hooks/useApiData';
import { api } from '@/lib/api';
import { Loader2, AlertCircle, Search, Settings2, Bell, Check, Plus, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AddBookWarehouseModal from '@/components/AddBookWarehouseModal';
import { Dropdown } from '@/components/Dropdown';
import { Pagination } from '@/components/Pagination';
import { matchKeywords } from '@/lib/searchUtils';

export default function CentralStockPage() {
  const [searchTerm, setSearchTerm] = useState('');

  // Add Book Modal State
  const [isAddBookOpen, setIsAddBookOpen] = useState(false);

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
    setCurrentPage(1);
  };

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const stockUrl = `/inventory/central-stock?page=${currentPage}&limit=${pageSize}` +
    (searchTerm.trim() ? `&search=${encodeURIComponent(searchTerm.trim())}` : '') +
    (publisherFilter !== 'ALL' ? `&publisherFilter=${publisherFilter}` : '') +
    `&sortField=${sortField}&sortDirection=${sortDirection}`;

  const { data: centralStockResponse, loading, error, refetch } = useApiData<any>(stockUrl, []);
  const stockList: any[] = centralStockResponse?.items || (Array.isArray(centralStockResponse) ? centralStockResponse : []);
  const totalStockCount: number = centralStockResponse?.total ?? stockList.length;

  // Notification states
  const [notifyingId, setNotifyingId] = useState<string | null>(null);
  const [notifiedItems, setNotifiedItems] = useState<Record<string, boolean>>({});

  // Modal State
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [newThreshold, setNewThreshold] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    try {
      setIsSubmitting(true);
      await api.patch(`/inventory/central-stock/${selectedItem.book.id}/threshold`, {
        threshold: newThreshold
      });
      setIsAdjusting(false);
      setSelectedItem(null);
      await refetch();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Update failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNotifyCentralManager = async (item: any) => {
    if (!item.book?.id) return;
    try {
      setNotifyingId(item.id);
      const res = await api.post(`/inventory/central-stock/${item.book.id}/notify-manager`, {});
      if (res.success) {
        setNotifiedItems(prev => ({ ...prev, [item.id]: true }));
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to notify manager');
    } finally {
      setNotifyingId(null);
    }
  };

  if (loading && (!stockList || stockList.length === 0)) {
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-black">Central Warehouse Stock</h2>
          <p className="text-sm text-neutral-500">Master inventory pool, reorder thresholds, and low stock alerts.</p>
        </div>
        <div className="mt-4 sm:mt-0 flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-muted-foreground" />
            </div>
            <input
              type="text"
              placeholder="Search title, author, ISBN, barcode, keywords..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-[#7e2562]/15 rounded-sm focus:ring-[#7e2562]/10 focus:border-[#7e2562] text-xs font-medium text-foreground bg-white outline-none"
            />
          </div>

          <div className="w-48 shrink-0">
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

          <button
            onClick={() => setIsAddBookOpen(true)}
            className="apple-button flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-sm shadow-plum-sm transition-all duration-150 active:scale-95 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>Add Book</span>
          </button>
        </div>
      </div>

      <div className="bg-white shadow-plum-sm border border-[#7e2562]/15 rounded-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#7e2562]/8">
            <thead className="bg-[#faf6f9]/60 border-b border-[#7e2562]/10">
              <tr>
                <th 
                  scope="col" 
                  onClick={() => toggleSort('title')}
                  className="px-6 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider cursor-pointer select-none group whitespace-nowrap hover:text-foreground transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Book Title & Author</span>
                    {sortField === 'title' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-primary font-bold" /> : <ArrowDown className="w-3.5 h-3.5 text-primary font-bold" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-muted-foreground/50 opacity-50 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Barcode / ISBN</th>
                <th 
                  scope="col" 
                  onClick={() => toggleSort('quantity')}
                  className="px-6 py-3 text-right text-xs font-bold text-muted-foreground uppercase tracking-wider cursor-pointer select-none group whitespace-nowrap hover:text-foreground transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Central Qty</span>
                    {sortField === 'quantity' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-primary font-bold" /> : <ArrowDown className="w-3.5 h-3.5 text-primary font-bold" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-muted-foreground/50 opacity-50 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                </th>
                <th 
                  scope="col" 
                  onClick={() => toggleSort('reorderThreshold')}
                  className="px-6 py-3 text-right text-xs font-bold text-muted-foreground uppercase tracking-wider cursor-pointer select-none group whitespace-nowrap hover:text-foreground transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Alert Limit</span>
                    {sortField === 'reorderThreshold' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-primary font-bold" /> : <ArrowDown className="w-3.5 h-3.5 text-primary font-bold" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-muted-foreground/50 opacity-50 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                </th>
                <th 
                  scope="col" 
                  onClick={() => toggleSort('status')}
                  className="px-6 py-3 text-center text-xs font-bold text-muted-foreground uppercase tracking-wider cursor-pointer select-none group whitespace-nowrap hover:text-foreground transition-colors"
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
              {stockList.map((item: any) => {
                const isLowStock = item.quantity <= item.reorderThreshold;
                const isNotified = !!notifiedItems[item.id];
                const isCurrentlyNotifying = notifyingId === item.id;
                const isKairali = 
                  item.book.publishType === 'KAIRALI_BOOKS' || 
                  item.book.publisher?.name?.toLowerCase().includes('kairali') || 
                  Boolean(item.book.pmsTitleId);

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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-muted-foreground font-medium">
                      {item.reorderThreshold}
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
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            Restock Needed (≤{item.reorderThreshold})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#f0fbf5] text-[#22794d] border border-[#bcecd2] shadow-2xs">
                            Healthy
                          </span>
                        )}

                        {/* Notify Manager Option for Low Stock */}
                        {isLowStock && (
                          <button
                            onClick={() => handleNotifyCentralManager(item)}
                            disabled={isCurrentlyNotifying || isNotified}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all duration-150 ${
                              isNotified
                                ? 'bg-neutral-100 text-black border-neutral-300 cursor-default'
                                : 'bg-black text-white hover:bg-neutral-900 border-neutral-800 shadow-sm active:scale-95 disabled:opacity-50'
                            }`}
                            title="Send low stock notification to Central Inventory Manager"
                          >
                            {isCurrentlyNotifying ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin text-white" />
                                <span>Notifying...</span>
                              </>
                            ) : isNotified ? (
                              <>
                                <Check className="w-3 h-3 text-black" />
                                <span>Notified ✓</span>
                              </>
                            ) : (
                              <>
                                <Bell className="w-3 h-3 text-white" />
                                <span>Notify Manager</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => {
                          setSelectedItem(item);
                          setNewThreshold(item.reorderThreshold);
                          setIsAdjusting(true);
                        }}
                        className="text-black hover:text-neutral-700 inline-flex items-center font-semibold text-xs border border-neutral-200 px-2.5 py-1 rounded-lg hover:bg-neutral-100 transition-colors"
                      >
                        <Settings2 className="w-3.5 h-3.5 mr-1 text-black" />
                        Set Count
                      </button>
                    </td>
                  </tr>
                );
              })}
              {stockList.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-neutral-500 text-sm">
                    No books found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalItems={totalStockCount}
          pageSize={pageSize}
          onPageChange={(page) => setCurrentPage(page)}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* Threshold Modal */}
      <AnimatePresence>
        {isAdjusting && selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-md p-6"
            >
              <h3 className="text-base font-bold text-black mb-1">Update Reorder Threshold</h3>
              <p className="text-xs text-neutral-600 mb-6">
                {selectedItem.book.title}
              </p>

              <form onSubmit={handleAdjust} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">New Limit</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newThreshold}
                    onChange={(e) => setNewThreshold(Number(e.target.value))}
                    className="block w-full px-3 py-2 border border-neutral-300 rounded-xl focus:ring-black focus:border-black text-sm"
                  />
                  <p className="text-[11px] text-neutral-500 mt-1">If stock drops below this number, it will be flagged for restock.</p>
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
                    disabled={isSubmitting}
                    className="flex items-center px-4 py-2 text-xs font-semibold text-white bg-black rounded-xl hover:bg-neutral-900 disabled:opacity-50 transition-colors"
                  >
                    {isSubmitting && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin text-white" />}
                    Save
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Book to Warehouse Modal */}
      <AddBookWarehouseModal
        isOpen={isAddBookOpen}
        onClose={() => setIsAddBookOpen(false)}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
