"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApiData } from '@/hooks/useApiData';
import { api } from '@/lib/api';
import { Loader2, Plus, Gift } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dropdown } from '@/components/Dropdown';
import { Pagination } from '@/components/Pagination';

export default function CreditCopiesPage() {
  const { user } = useAuth();
  const isAdmin = (user?.roles?.some(r => ['SUPER_ADMIN', 'ADMIN'].includes(r)) || false);

  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data: creditCopiesResponse, loading, error, refetch } = useApiData<any>(`/credit-copies?page=${page}&limit=${pageSize}`);
  const creditCopies = creditCopiesResponse?.items || (Array.isArray(creditCopiesResponse) ? creditCopiesResponse : []);
  const totalItems = creditCopiesResponse?.total || creditCopies.length;
  const totalPages = creditCopiesResponse?.totalPages || Math.ceil(totalItems / pageSize) || 1;

  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: catalog } = useApiData<any>(isCreating ? '/catalog/books?limit=50' : null, []);
  const { data: branchesResponse } = useApiData<any>('/branches', []);
  const branches = branchesResponse?.items || (Array.isArray(branchesResponse) ? branchesResponse : []);

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
      ? '/inventory/central-stock?limit=100'
      : `/inventory/branch/${activeBranchId}?limit=100`)
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

  if (loading) return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-[#7e2562]" /></div>;
  if (error) return <div className="text-[#e45e34] bg-[#fef5f2] border border-[#e45e34]/20 p-4 rounded-sm">Error: {error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            <Gift className="w-6 h-6 text-[#7e2562]" /> Credit Copies
          </h2>
          <p className="text-sm text-neutral-500 mt-0.5">Track and issue free promotional or complimentary books.</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="inline-flex items-center px-4 py-2.5 text-sm font-semibold text-white bg-[#7e2562] hover:bg-[#681b50] rounded-sm transition-all shadow-sm active:scale-95"
        >
          <Plus className="w-4 h-4 mr-2" />
          Issue Credit Copy
        </button>
      </div>

      <div className="bg-white shadow-sm border border-neutral-200/80 rounded-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#faf6f9]/70 text-[11px] font-bold text-[#7e2562] uppercase tracking-wider border-b border-[#7e2562]/10 whitespace-nowrap">
              <tr>
                <th className="px-6 py-3.5">Date</th>
                <th className="px-6 py-3.5">Book</th>
                <th className="px-6 py-3.5 text-center">Qty</th>
                <th className="px-6 py-3.5">Recipient</th>
                <th className="px-6 py-3.5">Issued By & Branch</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {(creditCopies || []).map((copy: any) => (
                <tr key={copy.id} className="hover:bg-[#faf6f9]/40 transition-colors">
                  <td className="px-6 py-3.5 whitespace-nowrap text-sm text-neutral-500">
                    {new Date(copy.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="text-sm font-bold text-neutral-900">{copy.book?.title}</div>
                    <div className="text-xs text-neutral-400 font-mono">ISBN: {copy.book?.isbn || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-3.5 whitespace-nowrap text-center">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-sm border bg-[#faedf5] text-[#7e2562] border-[#7e2562]/20">
                      {copy.quantity}
                    </span>
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="text-sm text-neutral-900 font-semibold">{copy.recipientName}</div>
                    {copy.note && <div className="text-xs text-neutral-500 italic max-w-[220px] truncate" title={copy.note}>"{copy.note}"</div>}
                  </td>
                  <td className="px-6 py-3.5 whitespace-nowrap text-sm text-neutral-600">
                    <div className="font-medium text-neutral-900">{copy.issuedBy?.name}</div>
                    <div className="text-xs text-neutral-400">{copy.branch?.name || 'Central'}</div>
                  </td>
                </tr>
              ))}
              {(!creditCopies || creditCopies.length === 0) && (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-neutral-400 font-medium">No credit copies found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setPage}
        />
      </div>

      <AnimatePresence>
        {isCreating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-sm border border-neutral-200 shadow-xl w-full max-w-lg p-6">
              <h3 className="text-base font-bold text-neutral-900 mb-4 flex items-center gap-2">
                <Gift className="w-5 h-5 text-[#7e2562]"/> Issue Credit Copy
              </h3>
              <form onSubmit={handleIssue} className="space-y-4">
                {isAdmin && (
                  <div>
                    <label className="block text-xs font-bold text-[#7e2562] uppercase tracking-wider mb-1">Select Branch</label>
                    <Dropdown
                      value={branchId}
                      onChange={(val) => setBranchId(val)}
                      placeholder="Central (Default)"
                      options={branches.map((b: any) => ({ value: b.id, label: b.name }))}
                      selectClassName="!rounded-sm !py-2 border-[#7e2562]/20"
                    />
                    <p className="text-[11px] text-neutral-400 mt-1">Leave blank to issue from Central stock.</p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-[#7e2562] uppercase tracking-wider mb-1">Select Book</label>
                  <Dropdown
                    searchable={true}
                    value={bookId}
                    onChange={(val) => setBookId(val)}
                    placeholder="Search by title, ISBN, or barcode..."
                    selectClassName="!rounded-sm !py-2 border-[#7e2562]/20"
                    options={(catalog?.books || catalog?.items || catalog?.data || (Array.isArray(catalog) ? catalog : [])).map((b: any) => {
                      const count = getBookCount(b.id);
                      return {
                        value: b.id,
                        label: b.title,
                        isbn: b.isbn,
                        barcode: b.barcode,
                        sublabel: `ISBN: ${b.isbn || 'N/A'}${b.barcode ? ` • Barcode: ${b.barcode}` : ''}`,
                        badge: `Stock: ${count}`,
                        badgeClassName: count > 0 ? 'bg-[#f0fbf5] text-[#3cb976] border border-[#3cb976]/30 font-bold' : 'bg-neutral-100 text-neutral-400 border border-neutral-200'
                      };
                    })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#7e2562] uppercase tracking-wider mb-1">Quantity</label>
                    <input 
                      required 
                      type="number" 
                      min="1" 
                      value={quantity} 
                      onChange={e => setQuantity(Number(e.target.value))} 
                      className="block w-full px-3 py-2 border border-[#7e2562]/20 rounded-sm sm:text-sm focus:ring-2 focus:ring-[#7e2562]/20 focus:border-[#7e2562] outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#7e2562] uppercase tracking-wider mb-1">Recipient Name</label>
                    <input 
                      required 
                      type="text" 
                      placeholder="e.g. Guest Speaker" 
                      value={recipientName} 
                      onChange={e => setRecipientName(e.target.value)} 
                      className="block w-full px-3 py-2 border border-[#7e2562]/20 rounded-sm sm:text-sm focus:ring-2 focus:ring-[#7e2562]/20 focus:border-[#7e2562] outline-none" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#7e2562] uppercase tracking-wider mb-1">Note (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="Reason for complimentary copy" 
                    value={note} 
                    onChange={e => setNote(e.target.value)} 
                    className="block w-full px-3 py-2 border border-[#7e2562]/20 rounded-sm sm:text-sm focus:ring-2 focus:ring-[#7e2562]/20 focus:border-[#7e2562] outline-none" 
                  />
                </div>

                <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-neutral-100">
                  <button 
                    type="button" 
                    onClick={() => setIsCreating(false)} 
                    className="px-4 py-2 text-sm font-semibold text-neutral-700 bg-white border border-neutral-200 rounded-sm hover:bg-neutral-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting || !bookId} 
                    className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-[#7e2562] hover:bg-[#681b50] rounded-sm transition-colors disabled:opacity-50 shadow-sm"
                  >
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
