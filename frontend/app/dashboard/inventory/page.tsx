"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Loader2, AlertCircle, Search, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApiData } from '@/hooks/useApiData';
import { Dropdown } from '@/components/Dropdown';

export default function BranchInventoryPage() {
  const { user } = useAuth();
  const canAdjust = ['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER', 'BRANCH_INVENTORY'].includes(user?.role || user?.primaryRole || '');
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Branch Selection (For Admins)
  const isGlobalAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(user?.role || user?.primaryRole || '') && !user?.branchId;
  const [selectedBranchId, setSelectedBranchId] = useState<string>(user?.branchId || '');
  const { data: branchesResponse } = useApiData<any>('/branches', []);
  const branches = branchesResponse?.items || (Array.isArray(branchesResponse) ? branchesResponse : []);
  const branchName = branches.find((b: any) => b.id === user?.branchId)?.name || 'Branch';

  // Modal State
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [adjustmentQuantity, setAdjustmentQuantity] = useState(0);
  const [adjustmentReason, setAdjustmentReason] = useState('CORRECTION');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      const res = await api.get(`/inventory/branch/${selectedBranchId}?limit=1000`);
      if (res.success) {
        setInventory(res.data.items || (Array.isArray(res.data) ? res.data : []));
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
    window.addEventListener('app:data-mutated', fetchInventory);
    return () => window.removeEventListener('app:data-mutated', fetchInventory);
  }, [selectedBranchId]);

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBook || !selectedBranchId) return;

    try {
      setIsSubmitting(true);
      await api.post(`/inventory/branch/${selectedBranchId}/book/${selectedBook.book.id}/adjust`, {
        quantity: adjustmentQuantity,
        reason: adjustmentReason,
      });
      setIsAdjusting(false);
      // Wait for SSE or rely on the fetch we do anyway? The api interceptor fires app:data-mutated
    } catch (err: any) {
      alert(err.response?.data?.message || 'Adjustment failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading && inventory.length === 0) {
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

  const filteredInventory = inventory.filter((item: any) => 
    item.book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.book.isbn.includes(searchTerm) ||
    item.book.barcode.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">
            {isGlobalAdmin ? "Branch Inventory" : `${branchName} Inventory`}
          </h2>
          <p className="text-sm text-gray-500">Manage local stock levels and adjustments.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
          {/* Branch Selector for Admins */}
          {isGlobalAdmin && (
            <div className="w-full sm:w-64">
              <Dropdown
                value={selectedBranchId}
                onChange={(val) => setSelectedBranchId(val)}
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

      {!selectedBranchId && isGlobalAdmin && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-8 rounded-xl text-center flex flex-col items-center">
          <Search className="w-12 h-12 text-blue-300 mb-3" />
          <h3 className="text-lg font-medium">Select a Branch</h3>
          <p className="text-sm mt-1 max-w-md">Please select a branch from the dropdown menu above to view and manage its inventory.</p>
        </div>
      )}

      {selectedBranchId && (
        <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Book</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ISBN / Barcode</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredInventory.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{item.book.title}</div>
                    <div className="text-sm text-gray-500">{item.book.author?.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.book.barcode}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                    {item.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {item.quantity <= item.reorderThreshold ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Low Stock
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        In Stock
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {canAdjust ? (
                      <button
                        onClick={() => {
                          setSelectedBook(item);
                          setAdjustmentQuantity(0);
                          setAdjustmentReason('CORRECTION');
                          setIsAdjusting(true);
                        }}
                        className="text-blue-600 hover:text-blue-900 flex items-center justify-end w-full"
                      >
                        <Edit2 className="w-4 h-4 mr-1" />
                        Adjust
                      </button>
                    ) : (
                      <span className="text-slate-400 font-medium text-xs">Read Only</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredInventory.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No inventory records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      <AnimatePresence>
        {isAdjusting && selectedBook && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-md p-6"
            >
              <h3 className="text-lg font-bold text-gray-900 mb-2">Adjust Inventory</h3>
              <p className="text-sm text-gray-500 mb-6">
                {selectedBook.book.title} (Current: {selectedBook.quantity})
              </p>

              <form onSubmit={handleAdjust} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity Change</label>
                  <input
                    type="number"
                    required
                    value={adjustmentQuantity}
                    onChange={(e) => setAdjustmentQuantity(Number(e.target.value))}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="e.g. -2 or 5"
                  />
                  <p className="text-xs text-gray-500 mt-1">Use negative values for missing/damaged items.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
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
                    disabled={isSubmitting || adjustmentQuantity === 0}
                    className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Confirm Adjustment
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
