"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApiData } from '@/hooks/useApiData';
import { api } from '@/lib/api';
import { Loader2, Plus, FileText, Gift, Trash2, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dropdown } from '@/components/Dropdown';

export default function CreditCopiesPage() {
  const { user } = useAuth();
  const isAdmin = (user?.roles?.some(r => ['SUPER_ADMIN', 'ADMIN'].includes(r)) || false);

  const { data: creditCopies, loading, error, refetch } = useApiData<any[]>('/credit-copies', []);
  const { data: catalog } = useApiData<any>('/catalog/books?limit=1000', []);
  const { data: branchesResponse } = useApiData<any>('/branches', []);
  const branches = branchesResponse?.items || (Array.isArray(branchesResponse) ? branchesResponse : []);

  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [bookId, setBookId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [recipientName, setRecipientName] = useState('');
  const [note, setNote] = useState('');
  const [branchId, setBranchId] = useState('');

  // Load stock for the active branch/central
  const activeBranchId = isAdmin ? branchId : (user?.branchId || '');
  const stockUrl = isCreating
    ? (!activeBranchId
      ? '/inventory/central-stock?limit=1000'
      : `/inventory/branch/${activeBranchId}?limit=1000`)
    : null;
  const { data: stockData } = useApiData<any>(stockUrl, null);

  // Map book ID to quantity for fast lookup
  const stockMap = new Map<string, number>();
  if (stockData) {
    const items = stockData.items || (Array.isArray(stockData) ? stockData : []);
    items.forEach((item: any) => {
      const bId = item.bookId || item.book?.id;
      if (bId !== undefined && bId !== null) {
        stockMap.set(String(bId), item.quantity);
      }
    });
  }

  const getBookCount = (bId: string) => {
    return stockMap.get(String(bId)) || 0;
  };

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await api.post('/credit-copies', {
        bookId,
        quantity,
        recipientName,
        note,
        branchId: isAdmin ? (branchId || undefined) : undefined
      });
      setIsCreating(false);
      setBookId(''); setQuantity(1); setRecipientName(''); setNote(''); setBranchId('');
      refetch(); // Refresh the list
    } catch (err: any) {
      console.error('Credit Issue Error:', err);
      alert(err.response?.data?.message || err.message || 'Failed to issue credit copy');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  if (error) return <div className="text-red-500 bg-red-50 p-4 rounded-lg">Error: {error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center">
            <Gift className="w-6 h-6 mr-2 text-rose-500" /> Credit Copies
          </h2>
          <p className="text-sm text-gray-500">Track and issue free promotional or complimentary books.</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Issue Credit Copy
        </button>
      </div>

      <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Book</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recipient</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issued By & Branch</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {(creditCopies || []).map((copy: any) => (
              <tr key={copy.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(copy.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-bold text-gray-900">{copy.book?.title}</div>
                  <div className="text-xs text-gray-500">ISBN: {copy.book?.isbn}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-rose-600">
                  {copy.quantity}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 font-medium">{copy.recipientName}</div>
                  {copy.note && <div className="text-xs text-gray-500 italic max-w-[200px] truncate" title={copy.note}>"{copy.note}"</div>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div>{copy.issuedBy?.name}</div>
                  <div className="text-xs">{copy.branch?.name || 'Central'}</div>
                </td>
              </tr>
            ))}
            {(!creditCopies || creditCopies.length === 0) && (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No credit copies found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {isCreating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><Gift className="w-5 h-5 mr-2 text-rose-500"/> Issue Credit Copy</h3>
              <form onSubmit={handleIssue} className="space-y-4">
                
                {isAdmin && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Branch</label>
                    <Dropdown
                      value={branchId}
                      onChange={(val) => setBranchId(val)}
                      placeholder="Central (Default)"
                      options={branches.map((b: any) => ({ value: b.id, label: b.name }))}
                    />
                    <p className="text-xs text-gray-500 mt-1">Leave blank to issue from Central stock.</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Book</label>
                  <Dropdown
                    searchable={true}
                    value={bookId}
                    onChange={(val) => setBookId(val)}
                    placeholder="Search and select book..."
                    options={(catalog?.books || catalog?.items || catalog?.data || (Array.isArray(catalog) ? catalog : [])).map((b: any) => {
                      const count = getBookCount(b.id);
                      return {
                        value: b.id,
                        label: b.title,
                        badge: `Stock: ${count}`,
                        badgeClassName: count > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                      };
                    })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                    <input required type="number" min="1" value={quantity} onChange={e => setQuantity(Number(e.target.value))} className="block w-full px-3 py-2 border rounded-lg sm:text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Name</label>
                    <input required type="text" placeholder="e.g. Guest Speaker" value={recipientName} onChange={e => setRecipientName(e.target.value)} className="block w-full px-3 py-2 border rounded-lg sm:text-sm" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Note (Optional)</label>
                  <input type="text" placeholder="Reason for complimentary copy" value={note} onChange={e => setNote(e.target.value)} className="block w-full px-3 py-2 border rounded-lg sm:text-sm" />
                </div>

                <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                  <button type="button" onClick={() => setIsCreating(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                  <button type="submit" disabled={isSubmitting || !bookId} className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700 disabled:opacity-50">
                    {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Issue Copy'}
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
