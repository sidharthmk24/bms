"use client";

import { useState } from 'react';
import { useApiData } from '@/hooks/useApiData';
import { api } from '@/lib/api';
import { Loader2, AlertCircle, Search, Settings2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CentralStockPage() {
  const { data: centralStock, loading, error, refetch } = useApiData<any[]>('/inventory/central-stock?limit=1000', []);
  const [searchTerm, setSearchTerm] = useState('');

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
      // Refetch to show updated threshold in the table immediately
      await refetch();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Update failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading && (!centralStock || centralStock.length === 0)) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
        <AlertCircle className="w-5 h-5 mr-2" />
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
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Central Warehouse Stock</h2>
          <p className="text-sm text-gray-500">Master inventory pool and reorder thresholds.</p>
        </div>
        <div className="mt-4 sm:mt-0 w-full sm:w-72">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search title or barcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
        </div>
      </div>

      <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Book</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ISBN / Barcode</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Threshold</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStock.map((item: any) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{item.book.title}</div>
                    <div className="text-sm text-gray-500">{item.book.author?.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.book.barcode}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900">
                    {item.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                    {item.reorderThreshold}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {item.quantity <= item.reorderThreshold ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Restock Needed
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Healthy
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => {
                        setSelectedItem(item);
                        setNewThreshold(item.reorderThreshold);
                        setIsAdjusting(true);
                      }}
                      className="text-blue-600 hover:text-blue-900 flex items-center justify-end w-full"
                    >
                      <Settings2 className="w-4 h-4 mr-1" />
                      Set Count
                    </button>
                  </td>
                </tr>
              ))}
              {filteredStock.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-md p-6"
            >
              <h3 className="text-lg font-bold text-gray-900 mb-2">Update Reorder Threshold</h3>
              <p className="text-sm text-gray-500 mb-6">
                {selectedItem.book.title}
              </p>

              <form onSubmit={handleAdjust} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Limit</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newThreshold}
                    onChange={(e) => setNewThreshold(Number(e.target.value))}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">If stock drops below this number, it will be flagged for restock.</p>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsAdjusting(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
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
