"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApiData } from '@/hooks/useApiData';
import { api } from '@/lib/api';
import { 
  X, 
  Search, 
  Plus, 
  Trash2, 
  Loader2, 
  BookOpen, 
  AlertCircle, 
  ArrowRight, 
  Check, 
  CheckCircle2,
  Building2,
  PackageCheck,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dropdown } from '@/components/Dropdown';

interface CreateTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newTransfer?: any) => void;
}

interface SelectedBook {
  id: string;
  title: string;
  isbn?: string;
  barcode?: string;
  authorName?: string;
}

interface TransferItem {
  bookId: string;
  title: string;
  isbn?: string;
  quantity: number;
  availableQuantity: number;
}

export default function CreateTransferModal({ isOpen, onClose, onSuccess }: CreateTransferModalProps) {
  const { user } = useAuth();
  
  // Branches list
  const { data: branchesResponse } = useApiData<any>('/branches', []);
  const branches = branchesResponse?.items || (Array.isArray(branchesResponse) ? branchesResponse : []);
  
  // Transfer route configuration
  const [fromBranchId, setFromBranchId] = useState('');
  const [toBranchId, setToBranchId] = useState(user?.branchId || '');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Transfer items cart
  const [items, setItems] = useState<TransferItem[]>([]);

  // Current active book selection state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [activeBook, setActiveBook] = useState<SelectedBook | null>(null);
  
  // Stock by branch for active book
  const [activeBranchStocks, setActiveBranchStocks] = useState<any[]>([]);
  const [loadingBranchStocks, setLoadingBranchStocks] = useState(false);
  const [activeQty, setActiveQty] = useState(1);

  // Permissions check
  const isChainRole = user?.roles?.some(r => ['SUPER_ADMIN', 'ADMIN', 'CENTRAL_INVENTORY_MANAGER'].includes(r));

  // Initialize destination branch if user is a branch manager / staff
  useEffect(() => {
    if (user?.branchId && !toBranchId) {
      setToBranchId(user.branchId);
    }
  }, [user, toBranchId]);

  // Book search debounce
  useEffect(() => {
    if (searchQuery.trim().length < 1) {
      setSearchResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await api.get(`/catalog/books?search=${encodeURIComponent(searchQuery)}&limit=10`);
        if (response.success && response.data) {
          setSearchResults(response.data.books || response.data.items || (Array.isArray(response.data) ? response.data : []));
        }
      } catch (err) {
        console.error('Book search failed:', err);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Select Book
  const handleSelectBook = async (book: any) => {
    // Check if already in items list
    if (items.some(i => i.bookId === book.id)) {
      setError(`"${book.title}" is already in the transfer list. You can adjust its quantity in the table.`);
      setSearchQuery('');
      setShowSearchResults(false);
      return;
    }

    setActiveBook({
      id: book.id,
      title: book.title,
      isbn: book.isbn,
      barcode: book.barcode,
      authorName: book.author?.name || book.authorName
    });
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
    setError(null);
    setActiveBranchStocks([]);
    setLoadingBranchStocks(true);
    setActiveQty(1);

    try {
      const response = await api.get(`/transfers/stock-by-book?bookId=${book.id}`);
      if (response.success && response.data) {
        const stocks = response.data;
        setActiveBranchStocks(stocks);

        // If fromBranchId was already set by a previous book, check if it has stock here
        if (fromBranchId) {
          const matching = stocks.find((s: any) => s.branchId === fromBranchId);
          if (matching) {
            setActiveQty(Math.min(1, matching.quantity || 1));
          }
        } else if (stocks.length > 0) {
          // Default to first branch that has stock
          setFromBranchId(stocks[0].branchId);
          setActiveQty(Math.min(1, stocks[0].quantity || 1));
        }
      }
    } catch (err) {
      console.error('Failed to fetch book stock by branch:', err);
      setError('Failed to fetch stock availability for this book.');
    } finally {
      setLoadingBranchStocks(false);
    }
  };

  // Select source branch for the current transfer
  const handleSelectSourceBranch = (branchId: string) => {
    setFromBranchId(branchId);
    setError(null);
    const stock = activeBranchStocks.find((s) => s.branchId === branchId);
    const maxQty = stock?.quantity || 1;
    if (activeQty > maxQty) {
      setActiveQty(maxQty);
    }
    // If toBranchId is same as new fromBranchId, reset toBranchId
    if (toBranchId === branchId) {
      const other = branches.find((b: any) => b.id !== branchId && b.isActive);
      setToBranchId(other?.id || '');
    }
  };

  // Add the active book to items list
  const handleAddActiveBookToList = () => {
    if (!activeBook) return;
    if (!fromBranchId) {
      setError('Please select which branch to transfer this book from.');
      return;
    }

    const sourceStock = activeBranchStocks.find(s => s.branchId === fromBranchId);
    const available = sourceStock?.quantity || 0;

    if (available <= 0) {
      setError(`The selected branch has 0 available copies of "${activeBook.title}".`);
      return;
    }

    const qtyToAdd = Math.max(1, activeQty);
    if (qtyToAdd > available) {
      setError(`Requested quantity (${qtyToAdd}) exceeds available stock (${available}).`);
      return;
    }

    setItems(prev => [
      ...prev,
      {
        bookId: activeBook.id,
        title: activeBook.title,
        isbn: activeBook.isbn,
        quantity: qtyToAdd,
        availableQuantity: available
      }
    ]);

    // Clear active book so user can add another
    setActiveBook(null);
    setActiveBranchStocks([]);
    setActiveQty(1);
    setError(null);
  };

  // Remove an item from the transfer list
  const handleRemoveItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
    // If no items remain and no active book, allow resetting fromBranch
    if (updated.length === 0 && !activeBook) {
      // Keep destination branch, keep fromBranchId or let user pick freely
    }
  };

  // Adjust quantity in list (supports both typing and buttons)
  const handleQuantityChange = (index: number, val: number | string) => {
    const item = items[index];
    if (val === '') {
      const updated = [...items];
      updated[index].quantity = 0;
      setItems(updated);
      return;
    }

    const num = typeof val === 'string' ? parseInt(val, 10) : val;
    if (isNaN(num)) return;

    if (num > item.availableQuantity) {
      setError(`Cannot request more than available copies (${item.availableQuantity}) for "${item.title}".`);
      const updated = [...items];
      updated[index].quantity = item.availableQuantity;
      setItems(updated);
      return;
    }

    const updated = [...items];
    updated[index].quantity = Math.max(0, num);
    setItems(updated);
    setError(null);
  };

  // Reset entire transfer form
  const handleReset = () => {
    setItems([]);
    setActiveBook(null);
    setActiveBranchStocks([]);
    setFromBranchId('');
    setToBranchId(user?.branchId || '');
    setNote('');
    setError(null);
  };

  // Submit Handler
  const handleSubmit = async () => {
    // Combine items list with activeBook if configured
    let finalItems = [...items];
    if (activeBook && fromBranchId) {
      const sourceStock = activeBranchStocks.find(s => s.branchId === fromBranchId);
      const available = sourceStock?.quantity || 0;
      if (available > 0 && activeQty > 0 && activeQty <= available) {
        finalItems.push({
          bookId: activeBook.id,
          title: activeBook.title,
          isbn: activeBook.isbn,
          quantity: activeQty,
          availableQuantity: available
        });
      }
    }

    if (finalItems.length === 0) {
      setError('Please add at least one book to the transfer list.');
      return;
    }
    if (!fromBranchId) {
      setError('Please select the source branch holding the stock.');
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

    if (!isChainRole && fromBranchId !== user?.branchId && toBranchId !== user?.branchId) {
      setError(`Transfers must involve your own branch ("${branches.find((b: any) => b.id === user?.branchId)?.name || 'Your Branch'}").`);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await api.post('/transfers', {
        fromBranchId,
        toBranchId,
        note,
        items: finalItems.map(i => ({ bookId: i.bookId, quantity: i.quantity }))
      });

      if (response.success) {
        onSuccess(response.data);
        onClose();
        handleReset();
      } else {
        setError(response.message || 'Failed to create transfer request.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'An error occurred while creating transfer.');
    } finally {
      setSaving(false);
    }
  };

  // Destination branch options (exclude selected fromBranch)
  const toOptions = branches
    .filter((b: any) => b.id !== fromBranchId && b.isActive)
    .map((b: any) => ({
      value: b.id,
      label: `${b.name} (${b.code})`
    }));

  if (!isOpen) return null;

  const fromBranchName = branches.find((b: any) => b.id === fromBranchId)?.name || 
    activeBranchStocks.find((s: any) => s.branchId === fromBranchId)?.branchName || 'Source';
  const toBranchName = branches.find((b: any) => b.id === toBranchId)?.name || 'Destination';

  const activeBranchStock = activeBranchStocks.find((s) => s.branchId === fromBranchId);
  const activeMaxStock = activeBranchStock?.quantity || 0;
  const totalBooksCount = items.length + (activeBook && activeMaxStock > 0 ? 1 : 0);
  const totalCopiesCount = items.reduce((acc, i) => acc + i.quantity, 0) + (activeBook && activeMaxStock > 0 ? activeQty : 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/70">
            <div>
              <h3 className="text-lg font-bold text-black">Request Stock Transfer</h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Add one or more books, inspect location stock, and dispatch to destination.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-black hover:bg-neutral-200/60 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 flex-1 overflow-y-auto min-h-0 space-y-6">
            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* ROUTE BANNER (If fromBranchId is locked by added items) */}
            {fromBranchId && (
              <div className="p-3 bg-neutral-900 text-white rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <span className="text-neutral-400">Transfer Route:</span>
                  <span className="font-bold text-white bg-white/15 px-2 py-0.5 rounded-md">{fromBranchName}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-neutral-400" />
                  <span className="font-bold text-white bg-white/15 px-2 py-0.5 rounded-md">{toBranchName}</span>
                </div>
                {items.length === 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setFromBranchId('');
                      setActiveBranchStocks([]);
                    }}
                    className="text-[11px] text-neutral-300 hover:text-white underline"
                  >
                    Change Source
                  </button>
                )}
              </div>
            )}

            {/* SECTION 1: SEARCH & ADD BOOK */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-600 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-black text-white text-[10px] flex items-center justify-center font-bold">1</span>
                  {items.length > 0 ? "Add Another Book to Transfer" : "Select Book to Transfer"}
                </span>
                {items.length > 0 && (
                  <span className="text-xs font-semibold text-neutral-500 font-normal">
                    {items.length} {items.length === 1 ? 'book' : 'books'} in transfer list
                  </span>
                )}
              </label>

              {/* Book Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  placeholder={
                    fromBranchId 
                      ? `Search books to transfer from ${fromBranchName}...`
                      : "Search by title, author, ISBN, or keywords..."
                  }
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSearchResults(true);
                  }}
                  onFocus={() => setShowSearchResults(true)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-neutral-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-black focus:border-black bg-white"
                />
                <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3.5" />
                {searching && <Loader2 className="w-4 h-4 text-black animate-spin absolute right-3.5 top-3.5" />}
              </div>

              {/* Search Dropdown Results */}
              <AnimatePresence>
                {showSearchResults && searchResults.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute z-30 w-full max-w-xl bg-white border border-neutral-200 shadow-xl rounded-xl mt-1.5 overflow-hidden max-h-60 overflow-y-auto divide-y divide-neutral-100"
                  >
                    {searchResults.map((book) => (
                      <button
                        key={book.id}
                        type="button"
                        onClick={() => handleSelectBook(book)}
                        className="w-full px-4 py-2.5 hover:bg-neutral-50 flex items-center justify-between text-left text-sm transition-colors"
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <BookOpen className="w-4 h-4 text-neutral-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-semibold text-black truncate">{book.title}</p>
                            <p className="text-xs text-neutral-500 font-mono">
                              {[
                                book.author?.name ? `Author: ${book.author.name}` : '',
                                book.isbn ? `ISBN: ${book.isbn}` : '',
                                book.barcode ? `Barcode: ${book.barcode}` : ''
                              ].filter(Boolean).join(' • ')}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-black bg-neutral-100 px-2.5 py-1 rounded-lg shrink-0">
                          Select
                        </span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ACTIVE BOOK CONFIGURATION CARD */}
            {activeBook && (
              <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-black text-white rounded-xl shrink-0">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-black truncate">{activeBook.title}</h4>
                      <p className="text-xs text-neutral-500 font-mono">
                        {[
                          activeBook.authorName ? `Author: ${activeBook.authorName}` : '',
                          activeBook.isbn ? `ISBN: ${activeBook.isbn}` : '',
                          activeBook.barcode ? `Barcode: ${activeBook.barcode}` : ''
                        ].filter(Boolean).join(' • ')}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveBook(null);
                      setActiveBranchStocks([]);
                    }}
                    className="p-1 text-neutral-400 hover:text-black rounded-lg transition"
                    title="Cancel selecting this book"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* LOCATIONS WITH STOCK */}
                <div className="space-y-2 pt-2 border-t border-neutral-200/80">
                  <label className="text-xs font-bold text-neutral-600 uppercase tracking-wider block">
                    {fromBranchId ? `Stock at Available Locations:` : `Select Source Branch (Where this book is in stock):`}
                  </label>

                  {loadingBranchStocks ? (
                    <div className="py-6 flex items-center justify-center text-xs text-neutral-500">
                      <Loader2 className="w-4 h-4 animate-spin text-black mr-2" />
                      Checking stock levels across branches...
                    </div>
                  ) : activeBranchStocks.length === 0 ? (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                      No branches or warehouse currently hold stock for this book.
                    </div>
                  ) : fromBranchId && !activeBranchStock ? (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                      <strong>{fromBranchName}</strong> has 0 copies of this book.
                      <span className="block mt-1 text-neutral-600">
                        Available at: {activeBranchStocks.map(s => `${s.branchName} (${s.quantity})`).join(', ')}.
                      </span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {activeBranchStocks.map((stock) => {
                        const isSelected = fromBranchId === stock.branchId;
                        const disabled = items.length > 0 && !isSelected;

                        return (
                          <div
                            key={stock.branchId}
                            onClick={() => {
                              if (!disabled) {
                                handleSelectSourceBranch(stock.branchId);
                              }
                            }}
                            className={`p-2.5 rounded-xl border transition-all select-none flex items-center justify-between ${
                              isSelected
                                ? 'bg-neutral-900 border-black text-white shadow-sm'
                                : disabled
                                  ? 'bg-neutral-100 border-neutral-200 text-neutral-400 opacity-60 cursor-not-allowed'
                                  : 'bg-white border-neutral-200 hover:border-neutral-400 text-neutral-800 hover:bg-neutral-50 cursor-pointer'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Building2 className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-neutral-500'}`} />
                              <div className="min-w-0">
                                <p className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-black'}`}>
                                  {stock.branchName}
                                </p>
                              </div>
                            </div>
                            <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${
                              isSelected
                                ? 'bg-white/20 text-white'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                            }`}>
                              {stock.quantity} in stock
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* QUANTITY & ADD BUTTON */}
                {fromBranchId && activeMaxStock > 0 && (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-neutral-200/80">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-neutral-700">Quantity:</span>
                      <div className="flex items-center border border-neutral-300 rounded-xl overflow-hidden bg-white shadow-sm h-8">
                        <button
                          type="button"
                          onClick={() => setActiveQty(prev => Math.max(1, prev - 1))}
                          disabled={activeQty <= 1}
                          className="px-2.5 h-full hover:bg-neutral-100 text-black text-xs font-bold border-r border-neutral-200 disabled:opacity-40"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={activeMaxStock}
                          value={activeQty === 0 ? '' : activeQty}
                          onChange={(e) => {
                            const valStr = e.target.value;
                            if (valStr === '') {
                              setActiveQty(0);
                              return;
                            }
                            const num = parseInt(valStr, 10);
                            if (!isNaN(num)) {
                              if (num > activeMaxStock) {
                                setActiveQty(activeMaxStock);
                              } else {
                                setActiveQty(Math.max(0, num));
                              }
                            }
                          }}
                          onBlur={() => {
                            if (activeQty < 1) {
                              setActiveQty(1);
                            }
                          }}
                          className="w-14 text-center text-xs font-bold text-black focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none bg-transparent"
                        />
                        <button
                          type="button"
                          onClick={() => setActiveQty(prev => Math.min(activeMaxStock, prev + 1))}
                          disabled={activeQty >= activeMaxStock}
                          className="px-2.5 h-full hover:bg-neutral-100 text-black text-xs font-bold border-l border-neutral-200 disabled:opacity-40"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-xs text-neutral-500">
                        (Max: <strong className="text-black">{activeMaxStock}</strong> copies)
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddActiveBookToList}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-black hover:bg-neutral-800 rounded-xl shadow-sm active:scale-95 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add to Transfer List</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* SECTION 2: TRANSFER ITEMS LIST / TABLE */}
            {items.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-neutral-600 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-black text-white text-[10px] flex items-center justify-center font-bold">2</span>
                    Transfer Items Summary ({items.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-xs text-neutral-500 hover:text-rose-600 font-semibold inline-flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset List
                  </button>
                </div>

                <div className="border border-neutral-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                  <table className="min-w-full divide-y divide-neutral-200">
                    <thead className="bg-neutral-50/80">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-xs font-bold text-neutral-600 uppercase">Book</th>
                        <th className="px-4 py-2.5 text-center text-xs font-bold text-neutral-600 uppercase">Quantity</th>
                        <th className="px-4 py-2.5 text-right text-xs font-bold text-neutral-600 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 text-sm">
                      {items.map((item, idx) => (
                        <tr key={item.bookId} className="hover:bg-neutral-50/60">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-black text-xs">{item.title}</div>
                            <div className="text-[11px] text-neutral-500 font-mono">
                              {item.isbn || 'ISBN: N/A'} • Available: {item.availableQuantity}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="inline-flex items-center border border-neutral-300 rounded-lg overflow-hidden bg-white shadow-sm h-7">
                              <button
                                type="button"
                                onClick={() => handleQuantityChange(idx, item.quantity - 1)}
                                disabled={item.quantity <= 1}
                                className="px-2 h-full hover:bg-neutral-100 text-black text-xs font-bold border-r border-neutral-200 disabled:opacity-40"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min={1}
                                max={item.availableQuantity}
                                value={item.quantity === 0 ? '' : item.quantity}
                                onChange={(e) => handleQuantityChange(idx, e.target.value)}
                                onBlur={() => {
                                  if (item.quantity < 1) {
                                    const updated = [...items];
                                    updated[idx].quantity = 1;
                                    setItems(updated);
                                  }
                                }}
                                className="w-12 text-center text-xs font-bold text-black focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none bg-transparent"
                              />
                              <button
                                type="button"
                                onClick={() => handleQuantityChange(idx, item.quantity + 1)}
                                disabled={item.quantity >= item.availableQuantity}
                                className="px-2 h-full hover:bg-neutral-100 text-black text-xs font-bold border-l border-neutral-200 disabled:opacity-40"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="p-1 text-neutral-400 hover:text-rose-600 rounded-lg transition"
                              title="Remove item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="px-4 py-2.5 bg-neutral-50/80 border-t border-neutral-200 text-xs text-neutral-600 flex justify-between font-semibold">
                    <span>Total Books: {items.length}</span>
                    <span>Total Copies: {items.reduce((acc, i) => acc + i.quantity, 0)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 3: DESTINATION & NOTES */}
            {fromBranchId && (
              <div className="space-y-4 pt-2 border-t border-neutral-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Destination Branch */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-600 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-black text-white text-[10px] flex items-center justify-center font-bold">3</span>
                      Destination Branch (To)
                    </label>
                    <Dropdown
                      value={toBranchId}
                      onChange={(val) => {
                        setToBranchId(val);
                        setError(null);
                      }}
                      placeholder="Select receiving branch..."
                      options={toOptions}
                      selectClassName="!rounded-xl border-neutral-300"
                    />
                  </div>

                  {/* Transfer Reason / Notes */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-600 uppercase tracking-wider">
                      Transfer Reason / Notes
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Replenishing stock for branch..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-black focus:border-black bg-white"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50/70 flex items-center justify-between">
            <div className="text-xs text-neutral-500 font-semibold">
              {totalBooksCount > 0 ? (
                <span>
                  Ready to transfer: <strong className="text-black font-bold">{totalCopiesCount} {totalCopiesCount === 1 ? 'copy' : 'copies'}</strong> ({totalBooksCount} {totalBooksCount === 1 ? 'title' : 'titles'})
                </span>
              ) : (
                <span>No books selected</span>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-100 rounded-xl transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={
                  saving || 
                  (items.length === 0 && (!activeBook || activeMaxStock <= 0)) ||
                  !fromBranchId || 
                  !toBranchId || 
                  fromBranchId === toBranchId
                }
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-black hover:bg-neutral-900 disabled:bg-neutral-300 rounded-xl shadow-sm active:scale-95 transition-all disabled:pointer-events-none"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <PackageCheck className="w-4 h-4 text-white" />
                    <span>Submit Transfer ({totalBooksCount} {totalBooksCount === 1 ? 'Book' : 'Books'})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
