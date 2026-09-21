"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import { useApiData } from '@/hooks/useApiData';
import { api } from '@/lib/api';
import { Loader2, Plus, Gift, Pencil, X, Check, Trash2, ArrowRightLeft, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dropdown } from '@/components/Dropdown';
import { Pagination } from '@/components/Pagination';

export default function CreditCopiesPage() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const isAdmin = (user?.roles?.some(r => ['SUPER_ADMIN', 'ADMIN'].includes(r)) || false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data: creditCopiesResponse, loading, error, refetch } = useApiData<any>(`/credit-copies?page=${page}&limit=${pageSize}`);
  const creditCopies = creditCopiesResponse?.items || (Array.isArray(creditCopiesResponse) ? creditCopiesResponse : []);
  const totalItems = creditCopiesResponse?.total || creditCopies.length;

  // Modal States
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit State
  const [editingCopy, setEditingCopy] = useState<any | null>(null);
  const [editBookId, setEditBookId] = useState('');
  const [editRecipientName, setEditRecipientName] = useState('');
  const [editQuantity, setEditQuantity] = useState(1);
  const [editNote, setEditNote] = useState('');
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  // Catalog & Branches
  const { data: catalog } = useApiData<any>((isCreating || editingCopy) ? '/catalog/books?limit=200' : null, []);
  const { data: branchesResponse } = useApiData<any>('/branches', []);
  const branches = branchesResponse?.items || (Array.isArray(branchesResponse) ? branchesResponse : []);

  // Form State (supports multiple items)
  const [branchId, setBranchId] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [note, setNote] = useState('');
  const [searchBookId, setSearchBookId] = useState('');
  const [items, setItems] = useState<Array<{ bookId: string; quantity: number }>>([]);

  // Load stock for the active branch/central
  const activeBranchId = isCreating 
    ? (isAdmin ? branchId : (user?.branchId || ''))
    : (editingCopy ? (editingCopy.branchId || '') : '');

  const stockUrl = (isCreating || editingCopy)
    ? (!activeBranchId
      ? '/inventory/central-stock?limit=200'
      : `/inventory/branch/${activeBranchId}?limit=200`)
    : null;

  const { data: stockData } = useApiData<any>(stockUrl, null);

  // Map book ID to quantity for fast lookup
  const stockMap = new Map<string, number>();
  if (stockData) {
    const stockItems = stockData.items || (Array.isArray(stockData) ? stockData : []);
    stockItems.forEach((item: any) => {
      const bId = item.bookId || item.book?.id;
      if (bId !== undefined && bId !== null) {
        stockMap.set(String(bId), item.quantity);
      }
    });
  }

  const getBookCount = (bId: string) => {
    return stockMap.get(String(bId)) || 0;
  };

  const booksList = catalog?.books || catalog?.items || catalog?.data || (Array.isArray(catalog) ? catalog : []);
  const bookOptions = booksList.map((b: any) => {
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
  });

  const handleAddBookToCart = (bId: string) => {
    if (!bId) return;
    const existingIndex = items.findIndex(it => it.bookId === bId);
    if (existingIndex >= 0) {
      setItems(items.map((it, i) => i === existingIndex ? { ...it, quantity: it.quantity + 1 } : it));
    } else {
      setItems([...items, { bookId: bId, quantity: 1 }]);
    }
    setSearchBookId('');
  };

  const handleRemoveItemRow = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemQuantityChange = (index: number, qty: number) => {
    setItems(items.map((it, i) => i === index ? { ...it, quantity: Math.max(1, qty) } : it));
  };

  const handleOpenCreate = () => {
    setItems([]);
    setSearchBookId('');
    setRecipientName('');
    setNote('');
    setBranchId(user?.branchId || '');
    setIsCreating(true);
  };

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = items.filter(it => it.bookId && it.quantity > 0);
    if (validItems.length === 0) {
      alert('Please search and add at least one book to issue.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (validItems.length === 1) {
        await api.post('/credit-copies', {
          bookId: validItems[0].bookId,
          quantity: validItems[0].quantity,
          recipientName,
          note,
          branchId: isAdmin ? (branchId || undefined) : undefined
        });
      } else {
        await api.post('/credit-copies', {
          items: validItems,
          recipientName,
          note,
          branchId: isAdmin ? (branchId || undefined) : undefined
        });
      }
      setIsCreating(false);
      setItems([]);
      setRecipientName(''); 
      setNote(''); 
      setBranchId('');
      refetch();
    } catch (err: any) {
      console.error('Credit Issue Error:', err);
      alert(err.response?.data?.message || err.message || 'Failed to issue credit copy');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (copy: any) => {
    setEditingCopy(copy);
    setEditBookId(copy.bookId || copy.book?.id || '');
    setEditRecipientName(copy.recipientName || '');
    setEditQuantity(Number(copy.quantity) || 1);
    setEditNote(copy.note || '');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCopy || !editBookId) return;

    try {
      setIsEditSubmitting(true);
      await api.patch(`/credit-copies/${editingCopy.id}`, {
        bookId: editBookId,
        recipientName: editRecipientName,
        quantity: editQuantity,
        note: editNote,
      });
      setEditingCopy(null);
      refetch();
    } catch (err: any) {
      console.error('Credit Copy Update Error:', err);
      alert(err.response?.data?.message || err.message || 'Failed to update credit copy');
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleDelete = async (copy: any) => {
    const bookTitle = copy.book?.title || 'this book';
    const ok = await confirm({
      title: "Remove Credit Copy Record",
      message: `Are you sure you want to remove the credit copy of "${bookTitle}" for ${copy.recipientName}? The ${copy.quantity} copy/copies will be returned to inventory stock.`,
      confirmText: "Yes, Remove Record",
      cancelText: "Cancel",
      variant: "danger",
    });
    if (!ok) return;

    try {
      await api.delete(`/credit-copies/${copy.id}`);
      if (editingCopy?.id === copy.id) {
        setEditingCopy(null);
      }
      refetch();
    } catch (err: any) {
      console.error('Credit Copy Delete Error:', err);
      alert(err.response?.data?.message || err.message || 'Failed to delete credit copy');
    }
  };

  const handleAddAnotherForRecipient = (copy: any) => {
    setEditingCopy(null);
    setRecipientName(copy.recipientName || '');
    setNote(copy.note || '');
    if (isAdmin && copy.branchId) {
      setBranchId(copy.branchId);
    }
    setItems([]);
    setIsCreating(true);
  };

  const selectedEditBook = booksList.find((b: any) => b.id === editBookId) || editingCopy?.book;
  const isBookChanged = editingCopy && editBookId && editBookId !== (editingCopy.bookId || editingCopy.book?.id);
  const validItems = items.filter(it => it.bookId && it.quantity > 0);

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
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center px-4 py-2.5 text-sm font-semibold text-white bg-[#7e2562] hover:bg-[#681b50] rounded-sm transition-all shadow-sm shadow-plum-sm active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-2" />
          Issue Credit Copy
        </button>
      </div>

      <div className="bg-white shadow-sm border border-neutral-200/80 rounded-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#faf6f9]/70 text-[11px] font-bold text-[#7e2562]   tracking-wider border-b border-[#7e2562]/10 whitespace-nowrap">
              <tr>
                <th className="px-6 py-3.5">Date</th>
                <th className="px-6 py-3.5">Book</th>
                <th className="px-6 py-3.5 text-center">Qty</th>
                <th className="px-6 py-3.5">Recipient</th>
                <th className="px-6 py-3.5">Issued By & Branch</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
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
                  <td className="px-6 py-3.5 whitespace-nowrap text-right">
                    <div className="flex justify-end items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(copy)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-neutral-700 bg-neutral-50 hover:bg-[#faedf5] hover:text-[#7e2562] border border-neutral-200 hover:border-[#7e2562]/30 rounded-sm transition-all shadow-2xs active:scale-95 cursor-pointer"
                        title="Edit book, quantity or recipient details"
                      >
                        <Pencil className="w-3.5 h-3.5 text-[#7e2562]" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(copy)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#c7451e] bg-[#fef5f2] hover:bg-[#fde8e1] border border-[#e45e34]/30 hover:border-[#e45e34]/60 rounded-sm transition-all shadow-2xs active:scale-95 cursor-pointer"
                        title="Remove credit copy record and return stock"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {(!creditCopies || creditCopies.length === 0) && (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-neutral-400 font-medium">No credit copies found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={page}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </div>

      {/* CREATE MODAL (Clean Search & Selected List) */}
      <AnimatePresence>
        {isCreating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-sm border border-neutral-200 shadow-xl w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
                <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                  <Gift className="w-5 h-5 text-[#7e2562]"/> Issue Credit Copies
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-[#faedf5] rounded-sm transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleIssue} className="space-y-4">
                {isAdmin && (
                  <div>
                    <label className="block text-xs font-bold text-[#7e2562]   tracking-wider mb-1">Select Branch Context</label>
                    <Dropdown
                      value={branchId}
                      onChange={(val) => setBranchId(val)}
                      placeholder="Central Warehouse (Default)"
                      options={branches.map((b: any) => ({ value: b.id, label: b.name }))}
                      selectClassName="!rounded-sm !py-2 border-[#7e2562]/20"
                    />
                    <p className="text-[11px] text-neutral-400 mt-1">Leave blank to issue from Central warehouse stock.</p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-[#7e2562]   tracking-wider mb-1">Recipient Name *</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="e.g. Chief Guest / Keynote Speaker / Promotion" 
                    value={recipientName} 
                    onChange={e => setRecipientName(e.target.value)} 
                    className="block w-full px-3 py-2 border border-[#7e2562]/20 rounded-sm sm:text-sm focus:ring-1 focus:ring-[#7e2562] focus:border-[#7e2562] outline-none" 
                  />
                </div>

                {/* Books Search & Selected List Section */}
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-[#7e2562]   tracking-wider mb-1">
                      Search & Add Books
                    </label>
                    <Dropdown
                      searchable={true}
                      value={searchBookId}
                      onChange={(val) => handleAddBookToCart(val)}
                      placeholder="Search books by title, ISBN, or barcode to add..."
                      selectClassName="!rounded-sm !py-2.5 border-[#7e2562]/20 bg-white"
                      options={bookOptions}
                    />
                  </div>

                  {/* Selected Books List */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-neutral-700   tracking-wider">
                        Books to Issue ({validItems.length})
                      </span>
                      {validItems.length > 0 && (
                        <span className="text-xs font-bold text-[#7e2562] bg-[#faedf5] px-2 py-0.5 rounded-sm border border-[#7e2562]/20">
                          {validItems.reduce((acc, it) => acc + it.quantity, 0)} Total Copies
                        </span>
                      )}
                    </div>

                    {validItems.length === 0 ? (
                      <div className="py-6 px-4 text-center border border-dashed border-[#7e2562]/20 rounded-sm bg-[#faf6f9]/50 text-neutral-400 text-xs">
                        <BookOpen className="w-6 h-6 mx-auto mb-1.5 text-[#7e2562]/40" />
                        No books added yet. Search and select books from the dropdown above to add them.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1 border border-[#7e2562]/15 rounded-sm bg-[#faf6f9]/30 p-2">
                        {validItems.map((item, idx) => {
                          const book = booksList.find((b: any) => b.id === item.bookId);
                          const availableStock = getBookCount(item.bookId);
                          return (
                            <div key={item.bookId} className="flex items-center justify-between gap-3 p-2.5 bg-white border border-[#7e2562]/15 rounded-sm shadow-2xs">
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-bold text-neutral-900 truncate">
                                  {book?.title || 'Unknown Title'}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] text-neutral-400 font-mono">
                                    ISBN: {book?.isbn || 'N/A'}
                                  </span>
                                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${availableStock > 0 ? 'bg-[#f0fbf5] text-[#2e945c] border border-[#3cb976]/30' : 'bg-[#fef5f2] text-[#e45e34] border border-[#e45e34]/30'}`}>
                                    Stock: {availableStock}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <div className="flex items-center border border-[#7e2562]/20 rounded-sm bg-neutral-50 overflow-hidden">
                                  <button
                                    type="button"
                                    onClick={() => handleItemQuantityChange(idx, item.quantity - 1)}
                                    className="px-2 py-1 text-neutral-600 hover:bg-[#faedf5] hover:text-[#7e2562] font-bold text-xs cursor-pointer"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => handleItemQuantityChange(idx, Math.max(1, Number(e.target.value)))}
                                    className="w-12 text-center text-xs font-bold bg-white border-x border-[#7e2562]/20 py-1 outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleItemQuantityChange(idx, item.quantity + 1)}
                                    className="px-2 py-1 text-neutral-600 hover:bg-[#faedf5] hover:text-[#7e2562] font-bold text-xs cursor-pointer"
                                  >
                                    +
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleRemoveItemRow(idx)}
                                  className="p-1.5 text-neutral-400 hover:text-[#e45e34] hover:bg-[#fef5f2] rounded-sm transition cursor-pointer"
                                  title="Remove this book"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#7e2562]   tracking-wider mb-1">Reason / Note (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Complimentary gift for keynote address" 
                    value={note} 
                    onChange={e => setNote(e.target.value)} 
                    className="block w-full px-3 py-2 border border-[#7e2562]/20 rounded-sm sm:text-sm focus:ring-1 focus:ring-[#7e2562] focus:border-[#7e2562] outline-none" 
                  />
                </div>

                <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-neutral-100">
                  <button 
                    type="button" 
                    onClick={() => setIsCreating(false)} 
                    className="px-4 py-2 text-xs font-bold   tracking-wider text-neutral-700 bg-white border border-neutral-300 rounded-sm hover:bg-neutral-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting || validItems.length === 0} 
                    className="inline-flex items-center px-4 py-2 text-xs font-bold   tracking-wider text-white bg-[#7e2562] hover:bg-[#681b50] rounded-sm transition-colors disabled:opacity-50 shadow-sm shadow-plum-sm cursor-pointer"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Gift className="w-4 h-4 mr-1.5" />}
                    <span>Issue {validItems.length > 1 ? `${validItems.length} Books` : 'Credit Copy'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT MODAL (Full Book Modification, Deletion, and Add More) */}
      <AnimatePresence>
        {editingCopy && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-sm border border-neutral-200 shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
                <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-[#7e2562]"/> Edit Credit Copy
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingCopy(null)}
                  className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-[#faedf5] rounded-sm transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Branch / Context indicator */}
              <div className="flex items-center justify-between text-xs px-3 py-1.5 bg-[#faf6f9] border border-[#7e2562]/15 rounded-sm mb-4">
                <span className="text-neutral-500">Issued from: <strong>{editingCopy.branch?.name || 'Central Warehouse'}</strong></span>
                <button
                  type="button"
                  onClick={() => handleAddAnotherForRecipient(editingCopy)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#7e2562] hover:underline cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Add another book for this recipient
                </button>
              </div>

              <form onSubmit={handleUpdate} className="space-y-4">
                {/* Book Selection with live swap */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-[#7e2562]   tracking-wider">
                      Selected Book *
                    </label>
                    {isBookChanged && (
                      <span className="inline-flex items-center text-[10px] font-bold text-[#e45e34] bg-[#fef5f2] px-1.5 py-0.5 rounded-sm border border-[#e45e34]/20">
                        <ArrowRightLeft className="w-3 h-3 mr-1" /> Book Replaced
                      </span>
                    )}
                  </div>
                  <Dropdown
                    searchable={true}
                    value={editBookId}
                    onChange={(val) => setEditBookId(val)}
                    placeholder="Search and select book to swap..."
                    selectClassName="!rounded-sm !py-2 border-[#7e2562]/20"
                    options={bookOptions}
                  />
                  {isBookChanged ? (
                    <p className="text-[11px] text-[#e45e34] mt-1">
                      Changing from <strong>"{editingCopy.book?.title}"</strong> to <strong>"{selectedEditBook?.title}"</strong>. Stock will be restored for previous book and deducted for new book.
                    </p>
                  ) : (
                    <p className="text-[11px] text-neutral-400 mt-1">
                      Current: {selectedEditBook?.title} (Available Stock: {getBookCount(editBookId)})
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#7e2562]   tracking-wider mb-1">Quantity *</label>
                    <input 
                      required 
                      type="number" 
                      min="1" 
                      value={editQuantity} 
                      onChange={e => setEditQuantity(Number(e.target.value))} 
                      className="block w-full px-3 py-2 border border-[#7e2562]/20 rounded-sm sm:text-sm focus:ring-1 focus:ring-[#7e2562] focus:border-[#7e2562] outline-none font-bold" 
                    />
                    <span className="text-[10px] text-neutral-400 mt-0.5 block">Stock delta will be adjusted automatically.</span>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#7e2562]   tracking-wider mb-1">Recipient Name *</label>
                    <input 
                      required 
                      type="text" 
                      placeholder="e.g. Chief Guest" 
                      value={editRecipientName} 
                      onChange={e => setEditRecipientName(e.target.value)} 
                      className="block w-full px-3 py-2 border border-[#7e2562]/20 rounded-sm sm:text-sm focus:ring-1 focus:ring-[#7e2562] focus:border-[#7e2562] outline-none" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#7e2562]   tracking-wider mb-1">Reason / Note (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="Reason for complimentary copy" 
                    value={editNote} 
                    onChange={e => setEditNote(e.target.value)} 
                    className="block w-full px-3 py-2 border border-[#7e2562]/20 rounded-sm sm:text-sm focus:ring-1 focus:ring-[#7e2562] focus:border-[#7e2562] outline-none" 
                  />
                </div>

                <div className="flex items-center justify-between pt-4 mt-6 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => handleDelete(editingCopy)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold   tracking-wider text-[#c7451e] bg-[#fef5f2] hover:bg-[#fde8e1] border border-[#e45e34]/30 hover:border-[#e45e34]/60 rounded-sm transition-all shadow-2xs active:scale-95 cursor-pointer"
                    title="Remove this credit copy and return copies back to inventory"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Record</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button 
                      type="button" 
                      onClick={() => setEditingCopy(null)} 
                      className="px-4 py-2 text-xs font-bold   tracking-wider text-neutral-700 bg-white border border-neutral-300 rounded-sm hover:bg-neutral-50 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      disabled={isEditSubmitting || !editBookId || !editRecipientName.trim() || editQuantity <= 0} 
                      className="inline-flex items-center px-4 py-2 text-xs font-bold   tracking-wider text-white bg-[#7e2562] hover:bg-[#681b50] rounded-sm transition-colors disabled:opacity-50 shadow-sm shadow-plum-sm cursor-pointer gap-1.5"
                    >
                      {isEditSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      <span>Save Changes</span>
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
