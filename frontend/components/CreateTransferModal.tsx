"use client";

import { useState, useEffect, useRef } from 'react';
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
  Check, 
  PackageCheck, 
  RotateCcw,
  ChevronDown,
  ChevronUp
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

interface TransferItem {
  bookId: string;
  title: string;
  isbn?: string;
  quantity: number;
  availableQuantity: number;
  branchStock?: number;
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

  // Multi-select book dropdown state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Permissions check
  const isChainRole = user?.roles?.some(r => ['SUPER_ADMIN', 'ADMIN', 'CENTRAL_INVENTORY_MANAGER'].includes(r));

  // Initialize destination branch if user is a branch manager / staff
  useEffect(() => {
    if (user?.branchId && !toBranchId) {
      setToBranchId(user.branchId);
    }
  }, [user, toBranchId]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
    };
    if (showSearchResults) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showSearchResults]);

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
      setSearchQuery('');
      setShowSearchResults(false);
      setError(null);
    }
  }, [isOpen, initialBook]);

  // Book search debounce / initial load
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const targetBranch = toBranchId || user?.branchId || '';
        const url = searchQuery.trim().length > 0 
          ? `/catalog/books?search=${encodeURIComponent(searchQuery)}&branchId=${targetBranch}&limit=50`
          : `/catalog/books?branchId=${targetBranch}&limit=50`;
          
        const response = await api.get(url);
        if (response.success && response.data) {
          const list = response.data.items || response.data?.books || (Array.isArray(response.data) ? response.data : []);
          setSearchResults(Array.isArray(list) ? list : []);
        }
      } catch (err) {
        console.error('Failed to search books:', err);
      } finally {
        setSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery, toBranchId, user?.branchId, isOpen]);

  // Selected Book IDs set
  const selectedBookIds = items.map(i => i.bookId);

  // Toggle book selection (multi-select)
  const handleToggleBookSelection = (book: any) => {
    const isSelected = selectedBookIds.includes(book.id);
    if (isSelected) {
      setItems(prev => prev.filter(i => i.bookId !== book.id));
    } else {
      setItems(prev => [
        ...prev,
        {
          bookId: book.id,
          title: book.title || book.name,
          isbn: book.isbn,
          quantity: 1,
          availableQuantity: 0,
          branchStock: book.branchStock ?? 0,
        }
      ]);
    }
    setError(null);
  };

  // Remove an item from the request list
  const handleRemoveItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
  };

  // Adjust quantity in list
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

  // Reset entire form
  const handleReset = () => {
    setItems([]);
    setFromBranchId('');
    setToBranchId(user?.branchId || '');
    setNote('');
    setError(null);
  };

  // Submit Handler
  const handleSubmit = async () => {
    if (items.length === 0) {
      setError('Please select at least one book for the restock request.');
      return;
    }
    if (!toBranchId) {
      setError('Please select the destination branch.');
      return;
    }

    // Filter out items with 0 quantity
    const validItems = items.filter(i => i.quantity > 0);
    if (validItems.length === 0) {
      setError('Please enter a valid requested quantity (> 0) for at least one book.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await api.post('/transfers', {
        fromBranchId: fromBranchId || undefined,
        toBranchId,
        note,
        items: validItems.map(i => ({ bookId: i.bookId, quantity: i.quantity }))
      });

      if (response.success) {
        onSuccess(response.data);
        onClose();
        handleReset();
      } else {
        setError(response.message || 'Failed to create restock request.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'An error occurred while submitting restock request.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-sm shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92dvh] border border-[#7e2562]/15"
        >
          {/* Header */}
          <div className="p-4 sm:px-6 sm:py-4 border-b border-[#7e2562]/10 flex items-center justify-between bg-gradient-to-r from-[#faedf5]/60 to-[#faf6f9] shrink-0">
            <div className="min-w-0 pr-2">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 truncate">
                Request Stock Restock
              </h3>
              <p className="text-xs text-gray-500 mt-0.5 hidden sm:block">
                Select multiple books to request for your branch inventory. Central Inventory will allocate and dispatch stock.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-[#faedf5] rounded-sm transition shrink-0 cursor-pointer"
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

            {/* Destination Branch Selector (for chain roles) */}
            {isChainRole && (
              <div className="p-3 bg-[#faedf5]/70 border border-[#7e2562]/20 rounded-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-gray-700">Requesting Destination Branch:</span>
                <div className="w-full sm:w-auto min-w-[240px]">
                  <Dropdown
                    value={toBranchId}
                    onChange={(val) => setToBranchId(val)}
                    options={branches.filter((b: any) => b.isActive).map((b: any) => ({
                      value: b.id,
                      label: `${b.name} (${b.code})`
                    }))}
                    placeholder="Select destination branch..."
                    selectClassName="text-xs py-1.5 px-3 border-[#7e2562]/20 bg-white font-medium"
                  />
                </div>
              </div>
            )}

            {/* SECTION 1: SEARCH & MULTI-SELECT BOOKS */}
            <div className="space-y-2 relative" ref={dropdownRef}>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#7e2562] tracking-wider flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-sm bg-[#7e2562] text-white text-[10px] flex items-center justify-center font-bold">1</span>
                  Select Books for Restock
                </label>
                {items.length > 0 && (
                  <span className="text-xs font-bold text-[#7e2562] bg-[#faedf5] px-2.5 py-0.5 rounded-full border border-[#7e2562]/20">
                    {items.length} {items.length === 1 ? 'book' : 'books'} selected
                  </span>
                )}
              </div>

              {/* Book Search Bar with Dropdown Toggle */}
              <div className="relative flex items-center">
                <input
                  type="text"
                  placeholder="Type book title, author, ISBN, or barcode to search..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSearchResults(true);
                  }}
                  onFocus={() => setShowSearchResults(true)}
                  className="w-full pl-9 pr-20 py-2.5 text-xs sm:text-sm border border-[#7e2562]/20 rounded-sm focus:outline-none focus:ring-1 focus:ring-[#7e2562] focus:border-[#7e2562] bg-white shadow-xs"
                />
                <Search className="w-4 h-4 text-gray-400 absolute left-3" />
                <div className="absolute right-2 flex items-center gap-1">
                  {searching && <Loader2 className="w-4 h-4 text-[#7e2562] animate-spin" />}
                  <button
                    type="button"
                    onClick={() => setShowSearchResults(!showSearchResults)}
                    className="p-1 text-[#7e2562] hover:bg-[#faedf5] rounded-sm transition text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    title={showSearchResults ? "Close dropdown" : "Open dropdown"}
                  >
                    {showSearchResults ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Multi-Select Dropdown Menu */}
              <AnimatePresence>
                {showSearchResults && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute left-0 right-0 top-full z-40 bg-white border border-[#7e2562]/20 shadow-2xl rounded-sm mt-1 overflow-hidden flex flex-col max-h-72"
                  >
                    {/* Dropdown Header bar */}
                    <div className="px-3 py-2 bg-[#faf6f9] border-b border-[#7e2562]/10 flex items-center justify-between text-xs shrink-0">
                      <span className="font-bold text-[#7e2562]">
                        Catalog Books {searchResults.length > 0 && `(${searchResults.length})`}
                      </span>
                      {/* <button
                        type="button"
                        onClick={() => setShowSearchResults(false)}
                        className="px-2 py-0.5 bg-[#7e2562] hover:bg-[#681b50] text-white rounded-sm text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <X className="w-3 h-3" /> Close Dropdown
                      </button> */}
                    </div>

                    {/* Scrollable list */}
                    <div className="overflow-y-auto divide-y divide-gray-100 flex-1">
                      {searchResults.length === 0 ? (
                        <div className="px-4 py-6 text-center text-xs text-gray-500 italic">
                          {searching ? 'Searching catalog...' : 'No matching books found.'}
                        </div>
                      ) : (
                        searchResults.map((book) => {
                          const isSelected = selectedBookIds.includes(book.id);
                          return (
                            <button
                              key={book.id}
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleToggleBookSelection(book);
                              }}
                              className={`w-full px-4 py-2.5 text-left text-xs flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-50/80 border-l-[3px] border-l-emerald-500 hover:bg-emerald-50'
                                  : 'hover:bg-[#faedf5]/40 border-l-[3px] border-l-transparent'
                              }`}
                            >
                              {/* Checkbox */}
                              <div className={`shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                isSelected
                                  ? 'bg-emerald-500 border-emerald-500'
                                  : 'bg-white border-gray-300'
                              }`}>
                                {isSelected && (
                                  <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none">
                                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                )}
                              </div>

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <span className={`font-bold block truncate ${isSelected ? 'text-emerald-900' : 'text-gray-900'}`}>
                                  {book.title || book.name}
                                </span>
                                <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5 flex-wrap">
                                  {book.isbn && <span>ISBN: {book.isbn}</span>}
                                  {(book.author?.name || book.authorName) && (
                                    <span>• {book.author?.name || book.authorName}</span>
                                  )}
                                </div>
                              </div>

                              {/* Stock & Action Badge */}
                              <div className="flex items-center gap-2 shrink-0">
                                {book.branchStock !== undefined && (
                                  <span className="text-[10px] font-semibold text-gray-500 hidden sm:inline">
                                    Stock: {book.branchStock}
                                  </span>
                                )}
                                {isSelected ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full">
                                    ✓ Added
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#7e2562] bg-[#faedf5] border border-[#7e2562]/20 px-2 py-0.5 rounded-full">
                                    + Add
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>

                    {/* Dropdown Footer bar */}
                    <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs shrink-0">
                      <span className="text-gray-500 font-medium">
                        {items.length} {items.length === 1 ? 'book' : 'books'} in request list
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowSearchResults(false)}
                        className="px-3 py-1 bg-[#7e2562] hover:bg-[#681b50] text-white rounded-sm text-xs font-bold transition cursor-pointer"
                      >
                        Done Selecting
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* SECTION 2: REQUESTED BOOKS LIST & QUANTITIES */}
            {items.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#7e2562] tracking-wider flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-sm bg-[#7e2562] text-white text-[10px] flex items-center justify-center font-bold">2</span>
                    Requested Books List ({items.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-xs text-gray-500 hover:text-[#e45e34] font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset List
                  </button>
                </div>

                <div className="border border-[#7e2562]/15 rounded-sm overflow-x-auto bg-white shadow-xs max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#faf6f9]/80 text-[11px] font-bold text-[#7e2562] tracking-wider border-b border-[#7e2562]/10 whitespace-nowrap sticky top-0 bg-white z-10">
                      <tr>
                        <th className="px-4 py-2.5">Book Title & Details</th>
                        <th className="px-4 py-2.5 text-center w-36">Requested Quantity</th>
                        <th className="px-4 py-2.5 text-right w-20">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {items.map((item, idx) => (
                        <tr key={item.bookId} className="hover:bg-[#faf6f9]/40 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-bold text-gray-900">{item.title}</div>
                            <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono mt-0.5">
                              {item.isbn && <span>ISBN: {item.isbn}</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="inline-flex items-center border border-[#7e2562]/20 rounded-sm overflow-hidden h-8 bg-white shadow-2xs">
                              <button
                                type="button"
                                onClick={() => handleQuantityChange(idx, Math.max(1, item.quantity - 1))}
                                className="px-2.5 h-full hover:bg-[#faedf5] text-gray-700 font-bold border-r border-[#7e2562]/20 cursor-pointer"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min={1}
                                value={item.quantity === 0 ? '' : item.quantity}
                                onChange={(e) => handleQuantityChange(idx, e.target.value)}
                                className="w-14 text-center text-xs font-bold text-gray-900 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleQuantityChange(idx, item.quantity + 1)}
                                className="px-2.5 h-full hover:bg-[#faedf5] text-gray-700 font-bold border-l border-[#7e2562]/20 cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="p-1.5 text-gray-400 hover:text-[#e45e34] hover:bg-[#fef5f2] rounded-sm transition cursor-pointer"
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
            ) : (
              <div className="p-6 border border-dashed border-gray-300 rounded-sm text-center bg-gray-50/50">
                <BookOpen className="w-8 h-8 text-gray-400 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-bold text-gray-600">No books added to request list yet</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Use the search box above to open the multi-select dropdown and select books.</p>
              </div>
            )}

            {/* Request Notes */}
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
              className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-sm hover:bg-gray-50 text-center cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving || items.length === 0}
              className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2 text-xs font-bold text-white bg-[#7e2562] hover:bg-[#681b50] disabled:opacity-50 rounded-sm shadow-xs transition-colors active:scale-[0.98] cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting Request...
                </>
              ) : (
                <>
                  <PackageCheck className="w-4 h-4 mr-1.5" /> Submit Restock Request ({items.length} {items.length === 1 ? 'book' : 'books'})
                </>
              )}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
