"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApiData } from '@/hooks/useApiData';
import { api } from '@/lib/api';
import { X, Search, Plus, Trash2, Loader2, BookOpen, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dropdown } from '@/components/Dropdown';

interface CreateTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface SelectedItem {
  bookId: string;
  title: string;
  isbn: string;
  quantity: number;
  availableQuantity: number;
}

export default function CreateTransferModal({ isOpen, onClose, onSuccess }: CreateTransferModalProps) {
  const { user } = useAuth();
  
  // Branches list
  const { data: branchesResponse } = useApiData<any>('/branches', []);
  const branches = branchesResponse?.items || (Array.isArray(branchesResponse) ? branchesResponse : []);
  
  const [fromBranchId, setFromBranchId] = useState('');
  const [toBranchId, setToBranchId] = useState(user?.branchId || '');
  const [note, setNote] = useState('');
  const [items, setItems] = useState<SelectedItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Book search autocomplete state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Book branch stock levels state
  const [selectedBookForBranchSelect, setSelectedBookForBranchSelect] = useState<any | null>(null);
  const [bookBranchStocks, setBookBranchStocks] = useState<any[]>([]);
  const [loadingBranchStocks, setLoadingBranchStocks] = useState(false);

  // Auto-reset fromBranchId when items are cleared
  useEffect(() => {
    if (items.length === 0) {
      setFromBranchId('');
    }
  }, [items]);

  // Permissions check
  const isChainRole = user?.roles?.some(r => ['SUPER_ADMIN', 'ADMIN', 'CENTRAL_INVENTORY_MANAGER'].includes(r));

  // Initialize destination branch
  useEffect(() => {
    if (user?.branchId) {
      setToBranchId(user.branchId);
    }
  }, [user]);

  // Book search handler
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await api.get(`/catalog/books?search=${encodeURIComponent(searchQuery)}&limit=5`);
        if (response.success && response.data) {
          setSearchResults(response.data.books || response.data.items || (Array.isArray(response.data) ? response.data : []));
        }
      } catch (err) {
        console.error('Book search failed:', err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const handleSelectBook = async (book: any) => {
    setSelectedBookForBranchSelect(book);
    setLoadingBranchStocks(true);
    setBookBranchStocks([]);
    setError(null);
    try {
      const response = await api.get(`/transfers/stock-by-book?bookId=${book.id}`);
      if (response.success && response.data) {
        setBookBranchStocks(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch book stock by branch:', err);
      setError('Failed to fetch book stock details.');
    } finally {
      setLoadingBranchStocks(false);
    }
  };

  const handleAddBook = (book: any, stock: any) => {
    // Check if already added
    if (items.some(item => item.bookId === book.id)) {
      setError(`"${book.title}" is already in the list.`);
      return;
    }

    setItems([...items, {
      bookId: book.id,
      title: book.title,
      isbn: book.isbn,
      quantity: 1,
      availableQuantity: stock.quantity
    }]);

    // Set source branch if not set yet
    if (!fromBranchId) {
      setFromBranchId(stock.branchId);
    }

    setSearchQuery('');
    setSearchResults([]);
    setSelectedBookForBranchSelect(null);
    setShowSearchResults(false);
    setError(null);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleQuantityChange = (index: number, val: number) => {
    if (val < 1) return;
    const item = items[index];
    if (val > item.availableQuantity) {
      setError(`Cannot request more than available quantity (${item.availableQuantity}) for "${item.title}".`);
      return;
    }
    const newItems = [...items];
    newItems[index].quantity = val;
    setItems(newItems);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!fromBranchId) {
      setError('Please select the source branch.');
      return;
    }
    if (!toBranchId) {
      setError('Please select the destination branch.');
      return;
    }
    if (fromBranchId === toBranchId) {
      setError('Source and destination branches must be different.');
      return;
    }
    if (items.length === 0) {
      setError('Please add at least one book to transfer.');
      return;
    }
    if (!isChainRole && fromBranchId !== user?.branchId && toBranchId !== user?.branchId) {
      setError(`For security, transfers must involve your own branch ("${branches.find((b: any) => b.id === user?.branchId)?.name || 'loading...'}").`);
      return;
    }
    for (const item of items) {
      if (item.quantity > item.availableQuantity) {
        setError(`Requested quantity for "${item.title}" exceeds available stock (${item.availableQuantity}).`);
        return;
      }
    }

    setSaving(true);
    setError(null);

    try {
      const response = await api.post('/transfers', {
        fromBranchId,
        toBranchId,
        note,
        items: items.map(item => ({ bookId: item.bookId, quantity: item.quantity }))
      });

      if (response.success) {
        onSuccess();
        onClose();
        // Reset states
        setFromBranchId('');
        setNote('');
        setItems([]);
      } else {
        setError(response.message || 'Failed to create transfer request.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'An error occurred.');
    } finally {
      setSaving(false);
    }
  };

  const fromOptions = branches
    .filter((b: any) => b.id !== toBranchId && b.isActive)
    .map((b: any) => ({
      value: b.id,
      label: `${b.name} (${b.code})`
    }));

  const toOptions = branches
    .filter((b: any) => b.id !== fromBranchId && b.isActive)
    .map((b: any) => ({
      value: b.id,
      label: `${b.name} (${b.code})`
    }));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200/60 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Request Stock Transfer</h3>
              <p className="text-xs text-slate-500 mt-0.5">Move books from one branch or central warehouse to another</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <div className="p-6 flex-1 overflow-y-auto min-h-0 space-y-6">
            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-sm font-semibold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Destination Branch */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Destination Branch (To)</label>
                <Dropdown
                  value={toBranchId}
                  onChange={setToBranchId}
                  placeholder="Select destination branch..."
                  options={toOptions}
                />
              </div>

              {/* Source Branch */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Source Branch (From)</label>
                <div className="px-3.5 py-2.5 bg-slate-50 border border-slate-200/60 rounded-xl text-slate-700 text-sm font-semibold">
                  {fromBranchId 
                    ? branches.find((b: any) => b.id === fromBranchId)?.name || 'Loading branch...'
                    : 'Auto-selected based on book choice'
                  }
                </div>
              </div>
            </div>

            {/* Note */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Transfer Notes / Reason</label>
              <input
                type="text"
                placeholder="e.g. Replenishing low inventory before weekend sale"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            {/* Book Search */}
            <div className="space-y-1.5 relative">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Add Books to Request</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search book by title or ISBN..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSearchResults(true);
                    setSelectedBookForBranchSelect(null);
                  }}
                  onFocus={() => setShowSearchResults(true)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                {searching && <Loader2 className="w-4 h-4 text-blue-500 animate-spin absolute right-3.5 top-3.5" />}
              </div>

              {/* Results dropdown */}
              <AnimatePresence>
                {showSearchResults && (searchResults.length > 0 || selectedBookForBranchSelect) && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute z-20 w-full bg-white border border-slate-200 shadow-lg rounded-xl mt-1.5 overflow-hidden max-h-64 overflow-y-auto divide-y divide-slate-100"
                  >
                    {selectedBookForBranchSelect ? (
                      <div className="p-3 space-y-2">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-1 text-xs">
                          <span className="font-bold text-slate-500">Available Stock for "{selectedBookForBranchSelect.title}":</span>
                          <button 
                            onClick={() => setSelectedBookForBranchSelect(null)}
                            className="text-blue-500 hover:text-blue-700 font-semibold"
                          >
                            Back
                          </button>
                        </div>
                        {loadingBranchStocks ? (
                          <div className="py-4 flex justify-center text-xs text-slate-400">
                            <Loader2 className="w-4 h-4 animate-spin text-blue-500 mr-2" />
                            Loading stocks...
                          </div>
                        ) : bookBranchStocks.length === 0 ? (
                          <div className="py-4 text-center text-xs text-rose-500 font-semibold">
                            This book is out of stock in all branches.
                          </div>
                        ) : (
                          <div className="space-y-1 max-h-40 overflow-y-auto">
                            {bookBranchStocks.map((stock) => {
                              const isSelf = stock.branchId === toBranchId;
                              const isLocked = fromBranchId && fromBranchId !== stock.branchId;
                              const isDisabled = isSelf || isLocked;

                              return (
                                <button
                                  key={stock.branchId}
                                  disabled={isDisabled}
                                  onClick={() => handleAddBook(selectedBookForBranchSelect, stock)}
                                  className={`w-full px-3 py-2 text-left text-xs rounded-lg flex items-center justify-between transition ${
                                    isDisabled 
                                      ? 'opacity-40 cursor-not-allowed bg-slate-50' 
                                      : 'hover:bg-blue-50/50 hover:text-blue-700 bg-slate-50/30'
                                  }`}
                                >
                                  <div>
                                    <span className="font-semibold text-slate-700">{stock.branchName}</span>
                                    <span className="text-[10px] text-slate-400 font-mono ml-1.5">({stock.branchCode})</span>
                                  </div>
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    isDisabled ? 'bg-slate-200 text-slate-500' : 'bg-blue-100 text-blue-800'
                                  }`}>
                                    {stock.quantity} available
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : (
                      searchResults.map((book) => (
                        <button
                          key={book.id}
                          onClick={() => handleSelectBook(book)}
                          className="w-full px-4 py-2.5 hover:bg-slate-50 flex items-center justify-between text-left text-sm"
                        >
                          <div className="flex items-center space-x-2 min-w-0">
                            <BookOpen className="w-4 h-4 text-slate-400 shrink-0" />
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-700 truncate">{book.title}</p>
                              <p className="text-xs text-slate-400 font-mono">{book.isbn}</p>
                            </div>
                          </div>
                          <Plus className="w-4 h-4 text-blue-500" />
                        </button>
                      ))
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Requested Items List */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Requested Items ({items.length})</label>
              {items.length === 0 ? (
                <div className="border border-dashed border-slate-200 rounded-2xl py-8 text-center text-slate-400 text-sm">
                  No books added yet. Search above to add items.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 bg-slate-50/20">
                  {items.map((item, index) => (
                    <div key={item.bookId} className="px-4 py-3 flex items-center justify-between space-x-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800 truncate">{item.title}</p>
                        <div className="flex items-center space-x-2 mt-0.5">
                          <span className="text-xs text-slate-400 font-mono">{item.isbn}</span>
                          <span className="text-xs text-slate-400">•</span>
                          <span className="text-xs font-semibold text-blue-600">Max: {item.availableQuantity} available</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 shrink-0">
                        {/* Quantity */}
                        <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white">
                          <button
                            onClick={() => handleQuantityChange(index, item.quantity - 1)}
                            className="px-2 py-1 hover:bg-slate-50 text-slate-500 text-sm font-bold border-r border-slate-200"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 1)}
                            className="w-12 text-center text-sm font-semibold focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <button
                            onClick={() => handleQuantityChange(index, item.quantity + 1)}
                            className="px-2 py-1 hover:bg-slate-50 text-slate-500 text-sm font-bold border-l border-slate-200"
                          >
                            +
                          </button>
                        </div>
                        
                        {/* Delete button */}
                        <button
                          onClick={() => handleRemoveItem(index)}
                          className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-200/60 bg-slate-50/50 flex justify-end space-x-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 text-sm font-semibold rounded-xl transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || items.length === 0}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-500/10 flex items-center space-x-2 transition"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Submit Request</span>
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
