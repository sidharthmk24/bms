"use client";

import { useState, useEffect, useRef } from 'react';
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '@/lib/api';

export function MultiSelectBookDropdown({
  books = [],
  onSelectBook,
  placeholder = "Type book title to search & add...",
  selectedIds = [],
  getStockQty,
  selectedBranchName,
}: {
  books: any[];
  onSelectBook: (book: any) => void;
  placeholder?: string;
  selectedIds?: string[];
  getStockQty?: (bookId: string) => number;
  selectedBranchName?: string;
}) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  // Debounced server search for query typed by user
  useEffect(() => {
    if (!search.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get(`/catalog/books?search=${encodeURIComponent(search.trim())}&limit=50`);
        if (res.success && res.data) {
          const list = res.data.items || res.data?.books || (Array.isArray(res.data) ? res.data : []);
          setSearchResults(list);
        }
      } catch (err) {
        console.error('Failed to search books:', err);
      } finally {
        setSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [search]);

  const safeBooks = Array.isArray(books) ? books : [];

  // Combine dynamic search results with local catalog list
  const displayList = search.trim() && searchResults.length > 0
    ? searchResults
    : safeBooks.filter((b) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase().trim();
        return (
          (b.title && b.title.toLowerCase().includes(q)) ||
          (b.name && b.name.toLowerCase().includes(q)) ||
          (b.isbn && b.isbn.toLowerCase().includes(q)) ||
          (b.authorName && b.authorName.toLowerCase().includes(q)) ||
          (b.author?.name && b.author.name.toLowerCase().includes(q))
        );
      });

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative flex items-center">
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full px-3 py-2 text-xs border border-gray-300 rounded-sm focus:ring-1 focus:ring-[#7e2562] focus:border-[#7e2562] bg-white text-gray-900 pr-9 cursor-text"
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 focus:outline-hidden cursor-pointer"
        >
          {searching ? (
            <Loader2 className="h-4 w-4 animate-spin text-[#7e2562]" />
          ) : isOpen ? (
            <ChevronUp className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          )}
        </button>
      </div>
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-sm shadow-xl z-50 divide-y divide-gray-100">
          {displayList.length === 0 ? (
            <div className="px-3 py-3 text-xs text-gray-500 italic text-center">
              {searching ? 'Searching catalog...' : 'No matching books found.'}
            </div>
          ) : (
            displayList.slice(0, 50).map((b) => {
              const isSelected = selectedIds.includes(b.id);
              const qty = getStockQty
                ? getStockQty(b.id)
                : (typeof b.quantity === 'number' ? b.quantity : (typeof b.stock === 'number' ? b.stock : 0));

              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onSelectBook(b);
                    setIsOpen(true);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center gap-3 transition-colors ${
                    isSelected
                      ? 'bg-emerald-50/80 border-l-[3px] border-l-emerald-500 hover:bg-emerald-50'
                      : 'hover:bg-[#faedf5]/40 border-l-[3px] border-l-transparent'
                  }`}
                >
                  {/* Checkbox indicator */}
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

                  {/* Book info */}
                  <div className="flex-1 min-w-0">
                    <span className={`font-semibold truncate block ${isSelected ? 'text-emerald-800' : 'text-gray-900'}`}>
                      {b.title || b.name}
                    </span>
                    <div className="text-[11px] text-gray-600 mt-0.5 font-medium">
                      {selectedBranchName ? `${selectedBranchName} Stock: ` : 'Available Stock: '}
                      <span className="font-bold text-[#7e2562]">{qty}</span> {qty === 1 ? 'book' : 'books'}
                    </div>
                  </div>

                  {/* Action badge */}
                  {isSelected ? (
                    <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full">
                      Added
                    </span>
                  ) : (
                    <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-[#7e2562] bg-[#faedf5] border border-[#7e2562]/20 px-2 py-0.5 rounded-full">
                      + Add
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
