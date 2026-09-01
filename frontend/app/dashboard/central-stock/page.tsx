"use client";

import { useState } from 'react';
import { useApiData } from '@/hooks/useApiData';
import { api } from '@/lib/api';
import { Loader2, AlertCircle, Search, Settings2, Bell, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CentralStockPage() {
  const { data: centralStock, loading, error, refetch } = useApiData<any[]>('/inventory/central-stock?limit=1000', []);
  const [searchTerm, setSearchTerm] = useState('');

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

  if (loading && (!centralStock || centralStock.length === 0)) {
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

  const stockList = (centralStock as any)?.items || (Array.isArray(centralStock) ? centralStock : []);
  const filteredStock = stockList.filter((item: any) => 
    item.book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.book.isbn.includes(searchTerm) ||
    item.book.barcode.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-black">Central Warehouse Stock</h2>
          <p className="text-sm text-neutral-500">Master inventory pool, reorder thresholds, and low stock alerts.</p>
        </div>
        <div className="mt-4 sm:mt-0 w-full sm:w-72">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-neutral-400" />
            </div>
            <input
              type="text"
              placeholder="Search title or barcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-neutral-300 rounded-xl focus:ring-black focus:border-black text-sm"
            />
          </div>
        </div>
      </div>

      <div className="bg-white shadow-sm border border-neutral-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50/80">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-neutral-600 uppercase tracking-wider">Book</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-neutral-600 uppercase tracking-wider">ISBN / Barcode</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-neutral-600 uppercase tracking-wider">Quantity</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-neutral-600 uppercase tracking-wider">Threshold</th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-bold text-neutral-600 uppercase tracking-wider">Status & Alerts</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-neutral-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-100">
              {filteredStock.map((item: any) => {
                const isLowStock = item.quantity <= item.reorderThreshold;
                const isNotified = !!notifiedItems[item.id];
                const isCurrentlyNotifying = notifyingId === item.id;

                return (
                  <tr key={item.id} className="hover:bg-neutral-50/60 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-black">{item.book.title}</div>
                      <div className="text-xs text-neutral-500">{item.book.author?.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-neutral-600 font-mono">
                      {item.book.barcode || item.book.isbn}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-black">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-neutral-500 font-medium">
                      {item.reorderThreshold}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        {isLowStock ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 text-black border border-neutral-300">
                            Restock Needed (≤{item.reorderThreshold})
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700">
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
              {filteredStock.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-neutral-500">
                    No central inventory records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
    </div>
  );
}
