"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApiData } from '@/hooks/useApiData';
import { api } from '@/lib/api';
import { Loader2, Plus, AlertCircle, CheckCircle, XCircle, Send, ArchiveRestore } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dropdown } from '@/components/Dropdown';

export default function RestockRequestsPage() {
  const { user } = useAuth();
  const isCentral = (user?.roles?.some(r => ['SUPER_ADMIN', 'ADMIN', 'CENTRAL_INVENTORY_MANAGER'].includes(r)) || false);
  
  const { data: requestsResponse, loading, error } = useApiData<any[]>('/restock-requests', []);
  const requests = requestsResponse?.items || (Array.isArray(requestsResponse) ? requestsResponse : []);
  const { data: catalog } = useApiData<any[]>('/books', []);

  // Creation State (Branch)
  const [isCreating, setIsCreating] = useState(false);
  const [cart, setCart] = useState<{bookId: string, quantity: number, title?: string}[]>([]);
  const [selectedBook, setSelectedBook] = useState('');
  const [quantity, setQuantity] = useState(5);
  
  // Review State (Central)
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewData, setReviewData] = useState<any[]>([]); // [{itemId, approvedQuantity}]
  const [reviewNote, setReviewNote] = useState('');

  const handleCreate = async () => {
    try {
      await api.post('/restock-requests', {
        items: cart.map(i => ({ bookId: i.bookId, quantity: i.quantity }))
      });
      setIsCreating(false);
      setCart([]);
      alert('Restock request submitted');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit request');
    }
  };

  const handleReview = async (status: 'APPROVED' | 'PARTIALLY_APPROVED' | 'REJECTED') => {
    if (!reviewingId) return;
    try {
      await api.patch(`/restock-requests/${reviewingId}/review`, {
        status,
        note: reviewNote,
        items: reviewData.map(r => ({
          bookId: r.bookId,
          quantityApproved: r.approvedQuantity
        }))
      });
      setReviewingId(null);
      setReviewNote('');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to review request');
    }
  };

  const handleDispatch = async (id: string) => {
    try {
      await api.post(`/restock-requests/${id}/dispatch`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to dispatch');
    }
  };

  const handleReceive = async (id: string) => {
    try {
      // In a real flow, branch might confirm exact received quantities.
      // We assume full receipt of dispatched items here for simplicity.
      await api.post(`/restock-requests/${id}/receive`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to receive');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING': return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Pending</span>;
      case 'APPROVED': return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Approved</span>;
      case 'PARTIALLY_APPROVED': return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Partially Approved</span>;
      case 'REJECTED': return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Rejected</span>;
      case 'FULFILLED': return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">Dispatched</span>;
      case 'RECEIVED': return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Received</span>;
      default: return null;
    }
  };

  if (loading && (!requests || requests.length === 0)) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Restock Requests</h2>
          <p className="text-sm text-gray-500">{isCentral ? 'Triage and dispatch branch stock requests.' : 'Request stock from the central warehouse.'}</p>
        </div>
        {!isCentral && (
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Request
          </button>
        )}
      </div>

      <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID / Branch</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {(requests || []).map((req) => (
              <tr key={req.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-bold text-gray-900">#{req.id.split('-')[0]}</div>
                  <div className="text-xs text-gray-500">{req.branch?.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(req.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {req.items?.length || 0} books requested
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  {getStatusBadge(req.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {isCentral && req.status === 'PENDING' && (
                    <button
                      onClick={() => {
                        setReviewingId(req.id);
                        setReviewData(req.items.map((i: any) => ({ itemId: i.id, bookId: i.bookId, approvedQuantity: i.quantityRequested })));
                      }}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Review
                    </button>
                  )}
                  {isCentral && (req.status === 'APPROVED' || req.status === 'PARTIALLY_APPROVED') && (
                    <button onClick={() => handleDispatch(req.id)} className="text-purple-600 hover:text-purple-900 flex items-center justify-end w-full">
                      <Send className="w-4 h-4 mr-1" /> Dispatch
                    </button>
                  )}
                  {!isCentral && req.status === 'FULFILLED' && (
                    <button onClick={() => handleReceive(req.id)} className="text-green-600 hover:text-green-900 flex items-center justify-end w-full">
                      <ArchiveRestore className="w-4 h-4 mr-1" /> Mark Received
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {requests?.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No restock requests found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Creation Modal (Branch) */}
      <AnimatePresence>
        {isCreating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">New Restock Request</h3>
              <div className="flex space-x-2 mb-6">
                <div className="flex-1">
                  <Dropdown
                    value={selectedBook}
                    onChange={(val) => setSelectedBook(val)}
                    placeholder="Select a book..."
                    options={(catalog?.books || catalog?.items || catalog?.data || (Array.isArray(catalog) ? catalog : [])).map((b: any) => ({
                      value: b.id,
                      label: `${b.title} (${b.barcode})`
                    }))}
                  />
                </div>
                <input type="number" min="1" value={quantity} onChange={e => setQuantity(Number(e.target.value))} className="w-24 block px-3 py-2 border border-gray-300 rounded-lg sm:text-sm" />
                <button 
                  onClick={() => {
                    if (selectedBook && quantity > 0) {
                      const bookList = catalog?.books || catalog?.items || catalog?.data || (Array.isArray(catalog) ? catalog : []);
                      const book = bookList.find((b: any) => b.id === selectedBook);
                      setCart([...cart, { bookId: selectedBook, quantity, title: book?.title }]);
                      setSelectedBook('');
                    }
                  }}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-sm font-medium"
                >Add</button>
              </div>

              <div className="border rounded-lg max-h-60 overflow-y-auto mb-6">
                <table className="min-w-full divide-y divide-gray-200">
                  <tbody className="bg-white divide-y divide-gray-200">
                    {cart.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.title}</td>
                        <td className="px-4 py-2 text-sm text-right font-medium">{item.quantity}</td>
                        <td className="px-4 py-2 text-right">
                          <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="text-red-500 text-sm">Remove</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button onClick={() => setIsCreating(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={handleCreate} disabled={cart.length === 0} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">Submit Request</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Review Modal (Central) */}
      <AnimatePresence>
        {reviewingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-xl shadow-xl w-full max-w-3xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Review Restock Request</h3>
              <div className="max-h-96 overflow-y-auto mb-6 border rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Book</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Available (HQ)</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Requested</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Approved</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {requests?.find(r => r.id === reviewingId)?.items.map((item: any) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3 text-sm text-gray-900">{item.book?.title}</td>
                        <td className="px-4 py-3 text-sm text-right text-blue-600 font-medium">
                          {item.centralStock?.quantity || 0}
                        </td>
                        <td className="px-4 py-3 text-sm text-right">{item.quantityRequested}</td>
                        <td className="px-4 py-3 text-right">
                          <input 
                            type="number" min="0" max={Math.min(item.quantityRequested, item.centralStock?.quantity || 0)}
                            value={reviewData.find(r => r.itemId === item.id)?.approvedQuantity || 0}
                            onChange={(e) => setReviewData(prev => prev.map(r => r.itemId === item.id ? { ...r, approvedQuantity: Number(e.target.value) } : r))}
                            className="w-20 text-right px-2 py-1 border border-gray-300 rounded"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Review Notes (Optional)</label>
                <textarea 
                  value={reviewNote} onChange={e => setReviewNote(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 sm:text-sm" rows={2}
                />
              </div>

              <div className="flex justify-between">
                <button onClick={() => setReviewingId(null)} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <div className="space-x-3">
                  <button onClick={() => handleReview('REJECTED')} className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg">Reject</button>
                  <button onClick={() => handleReview('APPROVED')} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg">Approve</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
