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

export interface InitialBookInfo {
  bookId?: string;
  id?: string;
  title: string;
  isbn?: string;
  quantity?: number;
}

interface CreateTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newTransfer?: any) => void;
  initialBook?: InitialBookInfo | null;
}

interface SelectedBook {
  id: string;
  title: string;
  isbn?: string;
  barcode?: string;
  authorName?: string;
  branchStock?: number;
}

interface TransferItem {
  bookId: string;
  title: string;
  isbn?: string;
  quantity: number;
  availableQuantity: number;
}

export default function CreateTransferModal({ isOpen, onClose, onSuccess, initialBook }: CreateTransferModalProps) {
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
  
  // Quantity for currently selected book
  const [activeQty, setActiveQty] = useState(1);

  // Permissions check
  const isChainRole = user?.roles?.some(r => ['SUPER_ADMIN', 'ADMIN', 'CENTRAL_INVENTORY_MANAGER'].includes(r));

  // Initialize destination branch if user is a branch manager / staff
  useEffect(() => {
    if (user?.branchId && !toBranchId) {
      setToBranchId(user.branchId);
    }
  }, [user, toBranchId]);

  // Handle prefilled initialBook when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialBook) {
        const targetBookId = initialBook.bookId || initialBook.id;
        const reqQty = initialBook.quantity && initialBook.quantity > 0 ? initialBook.quantity : 5;

        if (targetBookId) {
          setItems([
            {
              bookId: targetBookId,
              title: initialBook.title,
              isbn: initialBook.isbn,
              quantity: reqQty,
              availableQuantity: 999,
            },
          ]);
          setActiveBook(null);
        } else {
          const searchKey = initialBook.isbn || initialBook.title;
          api.get(`/catalog/books?search=${encodeURIComponent(searchKey)}&limit=5`)
            .then((res) => {
              if (res.success && res.data) {
                const list = res.data.items || res.data?.books || res.data;
                const match = Array.isArray(list)
                  ? list.find((b: any) => b.isbn === initialBook.isbn || b.title === initialBook.title) || list[0]
                  : null;
                if (match) {
                  setItems([
                    {
                      bookId: match.id,
                      title: match.title || initialBook.title,
                      isbn: match.isbn || initialBook.isbn,
                      quantity: reqQty,
                      availableQuantity: 999,
                    },
                  ]);
                  setActiveBook(null);
                } else {
                  setSearchQuery(initialBook.title);
                }
              }
            })
            .catch(() => {
              setSearchQuery(initialBook.title);
            });
        }
      }
    } else {
      setItems([]);
      setActiveBook(null);
      setSearchQuery('');
      setError(null);
    }
  }, [isOpen, initialBook]);

  // Book search debounce
  useEffect(() => {
    if (searchQuery.trim().length < 1) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const targetBranch = toBranchId || user?.branchId || '';
        const response = await api.get(`/catalog/books?search=${encodeURIComponent(searchQuery)}&branchId=${targetBranch}&limit=10`);
        if (response.success && response.data) {
          const list = response.data.items || response.data?.books || response.data;
          setSearchResults(Array.isArray(list) ? list : []);
        }
      } catch (err) {
        console.error('Failed to search books:', err);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, toBranchId, user?.branchId]);

  // Select a book from search dropdown
  const handleSelectBook = (book: any) => {
    setActiveBook({
      id: book.id,
      title: book.title,
      isbn: book.isbn,
      barcode: book.barcode,
      authorName: book.author?.name || book.authorName,
      branchStock: book.branchStock ?? 0,
    });
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
    setError(null);
    setActiveQty(1);
  };

  // Add the active book to items list
  const handleAddActiveBookToList = () => {
    if (!activeBook) return;

    const qtyToAdd = Math.max(1, activeQty);

    setItems(prev => [
      ...prev,
      {
        bookId: activeBook.id,
        title: activeBook.title,
        isbn: activeBook.isbn,
        quantity: qtyToAdd,
        availableQuantity: 0
      }
    ]);

    // Clear active book so user can add another
    setActiveBook(null);
    setActiveQty(1);
    setError(null);
  };

  // Remove an item from the transfer list
  const handleRemoveItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
  };

  // Adjust quantity in list (supports both typing and buttons)
  const handleQuantityChange = (index: number, val: number | string) => {
    if (val === '') {
      const updated = [...items];
      updated[index].quantity = 0;
      setItems(updated);
      return;
    }

    const num = typeof val === 'string' ? parseInt(val, 10) : val;
    if (isNaN(num)) return;

    const updated = [...items];
    updated[index].quantity = Math.max(1, num);
    setItems(updated);
    setError(null);
  };

  // Reset entire transfer form
  const handleReset = () => {
    setItems([]);
    setActiveBook(null);
    setFromBranchId('');
    setToBranchId(user?.branchId || '');
    setNote('');
    setError(null);
  };

  // Submit Handler
  const handleSubmit = async () => {
    // Combine items list with activeBook if configured
    let finalItems = [...items];
    if (activeBook && activeQty > 0) {
      finalItems.push({
        bookId: activeBook.id,
        title: activeBook.title,
        isbn: activeBook.isbn,
        quantity: activeQty,
        availableQuantity: 0
      });
    }

    if (finalItems.length === 0) {
      setError('Please add at least one book to the transfer request.');
      return;
    }
    if (!toBranchId) {
      setError('Please select the destination branch.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await api.post('/transfers', {
        fromBranchId: fromBranchId || undefined,
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
      setError(err.response?.data?.message || err.message || 'An error occurred while creating transfer request.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const destBranch = branches.find((b: any) => b.id === toBranchId);
  const destBranchName = destBranch?.name || 'Your Branch';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-sm shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92dvh] border border-[#7e2562]/15"
        >
          {/* Header */}
          <div className="p-4 sm:px-6 sm:py-4 border-b border-[#7e2562]/10 flex items-center justify-between bg-gradient-to-r from-[#faedf5]/60 to-[#faf6f9] shrink-0">
            <div className="min-w-0 pr-2">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 truncate">
                Request Stock Transfer
              </h3>
              <p className="text-xs text-gray-500 mt-0.5 hidden sm:block">
                Request books for your branch. Central Inventory will allocate and fulfill from available stock or PO.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-[#faedf5] rounded-sm transition shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-4 sm:space-y-5">
            {error && (
              <div className="p-3 bg-[#fef5f2] border border-[#e45e34]/20 rounded-sm text-[#e45e34] text-xs font-semibold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-[#e45e34] shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Destination Branch Context Banner */}
            <div className="p-3 bg-[#faedf5]/70 border border-[#7e2562]/20 rounded-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
              {/* <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#7e2562] shrink-0" />
                <div>
                  <span className="text-gray-500 font-medium">Requesting For: </span>
                  <strong className="text-[#7e2562] font-bold">{destBranchName}</strong>
                </div>
              </div> */}

              {isChainRole && (
                <div className="w-full sm:w-auto min-w-[200px]">
                  <Dropdown
                    value={toBranchId}
                    onChange={(val) => setToBranchId(val)}
                    options={branches.filter((b: any) => b.isActive).map((b: any) => ({
                      value: b.id,
                      label: `${b.name} (${b.code})`
                    }))}
                    placeholder="Select destination branch..."
                    selectClassName="text-xs py-1 px-2 border-[#7e2562]/20 bg-white"
                  />
                </div>
              )}
            </div>

            {/* SECTION 1: SEARCH & SELECT BOOKS */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#7e2562]   tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-sm bg-[#7e2562] text-white text-[10px] flex items-center justify-center font-bold">1</span>
                  {items.length > 0 ? "Add Another Book to Request" : "Search & Select Books Needed"}
                </span>
                {items.length > 0 && (
                  <span className="text-xs font-semibold text-gray-400">
                    {items.length} {items.length === 1 ? 'book' : 'books'} in request list
                  </span>
                )}
              </label>

              {/* Book Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by book title, author, ISBN, or barcode..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSearchResults(true);
                  }}
                  onFocus={() => setShowSearchResults(true)}
                  className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm border border-[#7e2562]/20 rounded-sm focus:outline-none focus:ring-1 focus:ring-[#7e2562] focus:border-[#7e2562] bg-white shadow-xs"
                />
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                {searching && <Loader2 className="w-4 h-4 text-[#7e2562] animate-spin absolute right-3 top-2.5" />}
              </div>

              {/* Search Dropdown Results */}
              <AnimatePresence>
                {showSearchResults && searchResults.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="relative z-30 w-full bg-white border border-[#7e2562]/20 shadow-xl rounded-sm mt-1 overflow-hidden max-h-60 overflow-y-auto divide-y divide-gray-100"
                  >
                    {searchResults.map((book) => (
                      <button
                        key={book.id}
                        type="button"
                        onClick={() => handleSelectBook(book)}
                        className="w-full px-4 py-2.5 hover:bg-[#faedf5]/50 flex items-center justify-between text-left text-xs sm:text-sm transition-colors"
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <BookOpen className="w-4 h-4 text-[#7e2562] shrink-0" />
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 truncate text-xs">{book.title}</p>
                            <div className="flex items-center gap-1.5 text-[11px] mt-0.5 flex-wrap">
                              {book.author?.name && (
                                <span className="text-gray-500 font-medium">Author: {book.author.name}</span>
                              )}
                              {book.author?.name && <span className="text-gray-300">•</span>}
                              <span className="font-semibold text-gray-700">
                                Current Branch Stock:{' '}
                                <strong className={Number(book.branchStock || 0) > 0 ? 'text-[#3cb976]' : 'text-[#e45e34]'}>
                                  {Number(book.branchStock || 0)} {Number(book.branchStock || 0) === 1 ? 'copy' : 'copies'}
                                </strong>
                              </span>
                            </div>
                          </div>
                        </div>
                        <span className="text-[11px] font-bold text-[#7e2562] bg-[#faedf5] px-2.5 py-0.5 rounded-sm border border-[#7e2562]/20 shrink-0">
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
              <div className="p-3 sm:p-4 bg-[#faf6f9]/60 border border-[#7e2562]/15 rounded-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 bg-[#7e2562] text-white rounded-sm shrink-0 shadow-xs">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-gray-900 truncate">{activeBook.title}</h4>
                      <div className="flex items-center gap-1.5 text-[11px] mt-0.5 flex-wrap">
                        {activeBook.authorName && (
                          <span className="text-gray-500 font-medium">Author: {activeBook.authorName}</span>
                        )}
                        {activeBook.authorName && <span className="text-gray-300">•</span>}
                        <span className="font-semibold text-gray-700">
                          Current Branch Stock:{' '}
                          <strong className={Number(activeBook.branchStock || 0) > 0 ? 'text-[#3cb976]' : 'text-[#e45e34]'}>
                            {Number(activeBook.branchStock || 0)} {Number(activeBook.branchStock || 0) === 1 ? 'copy' : 'copies'}
                          </strong>
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveBook(null);
                    }}
                    className="p-1 text-gray-400 hover:text-gray-700 rounded-sm transition shrink-0"
                    title="Cancel selecting this book"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* QUANTITY INPUT & ADD BUTTON */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-[#7e2562]/10">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-700">Requested Copies:</span>
                    <div className="flex items-center border border-[#7e2562]/20 rounded-sm overflow-hidden bg-white shadow-xs h-8">
                      <button
                        type="button"
                        onClick={() => setActiveQty(prev => Math.max(1, prev - 1))}
                        disabled={activeQty <= 1}
                        className="px-2.5 h-full hover:bg-[#faedf5] text-gray-800 text-xs font-bold border-r border-[#7e2562]/20 disabled:opacity-40"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={1}
                        value={activeQty === 0 ? '' : activeQty}
                        onChange={(e) => {
                          const valStr = e.target.value;
                          if (valStr === '') {
                            setActiveQty(0);
                            return;
                          }
                          const num = parseInt(valStr, 10);
                          if (!isNaN(num)) {
                            setActiveQty(Math.max(1, num));
                          }
                        }}
                        onBlur={() => {
                          if (activeQty < 1) setActiveQty(1);
                        }}
                        className="w-14 text-center text-xs font-bold text-gray-900 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none bg-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => setActiveQty(prev => prev + 1)}
                        className="px-2.5 h-full hover:bg-[#faedf5] text-gray-800 text-xs font-bold border-l border-[#7e2562]/20"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!activeBook) return;
                      const qtyToAdd = Math.max(1, activeQty);
                      setItems(prev => [
                        ...prev,
                        {
                          bookId: activeBook.id,
                          title: activeBook.title,
                          isbn: activeBook.isbn,
                          quantity: qtyToAdd,
                          availableQuantity: 0
                        }
                      ]);
                      setActiveBook(null);
                      setActiveQty(1);
                      setError(null);
                    }}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#7e2562] hover:bg-[#681b50] rounded-sm shadow-xs active:scale-95 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add to Request List</span>
                  </button>
                </div>
              </div>
            )}

            {/* SECTION 2: REQUEST ITEMS TABLE */}
            {items.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#7e2562]   tracking-wider flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-sm bg-[#7e2562] text-white text-[10px] flex items-center justify-center font-bold">2</span>
                    Requested Books ({items.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-xs text-gray-500 hover:text-[#e45e34] font-semibold inline-flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset List
                  </button>
                </div>

                <div className="border border-[#7e2562]/15 rounded-sm overflow-x-auto bg-white shadow-xs">
                  <table className="min-w-[480px] w-full text-left text-xs">
                    <thead className="bg-[#faf6f9]/70 text-[11px] font-bold text-[#7e2562]   tracking-wider border-b border-[#7e2562]/10 whitespace-nowrap">
                      <tr>
                        <th className="px-4 py-2.5">Book Title</th>
                        <th className="px-4 py-2.5 text-center w-28">Requested Qty</th>
                        <th className="px-4 py-2.5 text-right w-20">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {items.map((item, idx) => (
                        <tr key={item.bookId} className="hover:bg-[#faf6f9]/30 transition-colors">
                          <td className="px-4 py-2.5">
                            <div className="font-semibold text-gray-900">{item.title}</div>
                            {item.isbn && <div className="text-[10px] text-gray-400 font-mono">{item.isbn}</div>}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <div className="inline-flex items-center border border-gray-300 rounded-sm overflow-hidden h-7">
                              <button
                                type="button"
                                onClick={() => handleQuantityChange(idx, Math.max(1, item.quantity - 1))}
                                className="px-2 h-full hover:bg-gray-100 text-gray-700 font-bold border-r border-gray-200"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min={1}
                                value={item.quantity === 0 ? '' : item.quantity}
                                onChange={(e) => handleQuantityChange(idx, e.target.value)}
                                className="w-12 text-center text-xs font-bold text-gray-900 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleQuantityChange(idx, item.quantity + 1)}
                                className="px-2 h-full hover:bg-gray-100 text-gray-700 font-bold border-l border-gray-200"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="p-1 text-gray-400 hover:text-[#e45e34] rounded-sm transition"
                              title="Remove item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Optional Request Note */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Request Notes / Instructions (Optional)</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="E.g., Urgently needed for customer reservation or upcoming branch display..."
                rows={2}
                className="w-full p-2.5 text-xs sm:text-sm border border-gray-300 rounded-sm focus:ring-1 focus:ring-[#7e2562] focus:border-[#7e2562]"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 sm:px-6 sm:py-3 border-t border-gray-200 bg-gray-50 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-sm hover:bg-gray-50 text-center"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving || (items.length === 0 && (!activeBook || activeQty < 1))}
              className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2 text-sm font-semibold text-white bg-[#7e2562] hover:bg-[#681b50] disabled:opacity-50 rounded-sm shadow-xs transition-colors active:scale-[0.98]"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting Request...
                </>
              ) : (
                <>
                  <PackageCheck className="w-4 h-4 mr-1.5" /> Submit Stock Request
                </>
              )}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
