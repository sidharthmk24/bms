"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { 
  X, 
  BookPlus, 
  Loader2, 
  AlertCircle, 
  Barcode, 
  Building2, 
  Tag, 
  User as UserIcon,
  Check
} from 'lucide-react';
import { Dropdown } from '@/components/Dropdown';

interface AddBookWarehouseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const COMMON_CATEGORIES = [
  'Technology & Programming',
  'Fiction & Literature',
  'Self-Help & Motivation',
  'Business & Economics',
  'Science & Mathematics',
  'History & Politics',
  'Biography & Memoir',
  'Philosophy & Spirituality',
  'Comics & Graphic Novels',
  'Children & Young Adult',
  'Academic & Textbooks',
  'Other',
];

export default function AddBookWarehouseModal({
  isOpen,
  onClose,
  onSuccess,
}: AddBookWarehouseModalProps) {
  const [title, setTitle] = useState('');
  const [isbn, setIsbn] = useState('');
  const [barcode, setBarcode] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Technology & Programming');
  const [customCategory, setCustomCategory] = useState('');
  const [publisherName, setPublisherName] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [costPrice, setCostPrice] = useState<number | ''>('');
  const [initialQuantity, setInitialQuantity] = useState<number>(50);
  const [reorderThreshold, setReorderThreshold] = useState<number>(15);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle ISBN change: auto-sync barcode if barcode hasn't been custom modified
  const handleIsbnChange = (val: string) => {
    setIsbn(val);
    if (!barcode || barcode === isbn) {
      setBarcode(val);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Book title is required');
      return;
    }
    if (!isbn.trim()) {
      setError('ISBN is required');
      return;
    }
    if (price === '' || isNaN(Number(price)) || Number(price) < 0) {
      setError('A valid selling price is required');
      return;
    }

    const finalCategory = selectedCategory === 'Other' ? customCategory.trim() : selectedCategory;
    if (selectedCategory === 'Other' && !finalCategory) {
      setError('Please specify the custom category name');
      return;
    }

    try {
      setLoading(true);
      const res = await api.post('/inventory/central-stock/add-book', {
        title: title.trim(),
        isbn: isbn.trim(),
        barcode: (barcode.trim() || isbn.trim()),
        authorName: authorName.trim() || undefined,
        categoryName: finalCategory || undefined,
        publisherName: publisherName.trim() || undefined,
        price: Number(price),
        costPrice: costPrice !== '' ? Number(costPrice) : undefined,
        initialQuantity: Number(initialQuantity) || 0,
        reorderThreshold: Number(reorderThreshold) || 15,
      });

      if (res.success) {
        // Reset form
        setTitle('');
        setIsbn('');
        setBarcode('');
        setAuthorName('');
        setSelectedCategory('Technology & Programming');
        setCustomCategory('');
        setPublisherName('');
        setPrice('');
        setCostPrice('');
        setInitialQuantity(50);
        setReorderThreshold(15);
        onSuccess();
        onClose();
      } else {
        setError(res.message || 'Failed to add book to warehouse');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to add book');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-sm shadow-2xl border border-neutral-200/80 w-full max-w-2xl overflow-hidden my-8"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-[#faf6f9]/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-sm bg-[#7e2562] text-white flex items-center justify-center shadow-sm">
              <BookPlus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 tracking-tight">Add Book to Warehouse</h3>
              <p className="text-xs text-neutral-500">Register a new title directly into Central Warehouse inventory.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-[#faedf5] rounded-sm transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-sm bg-[#fef5f2] border border-[#e45e34]/20 flex items-start gap-2.5 text-xs text-[#e45e34] font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-[#7e2562] uppercase tracking-wider mb-1">
              Book Title <span className="text-[#e45e34]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g., Clean Code: A Handbook of Agile Software Craftsmanship"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-[#7e2562]/20 rounded-sm focus:ring-2 focus:ring-[#7e2562]/20 focus:border-[#7e2562] outline-none transition-all"
            />
          </div>

          {/* ISBN & Barcode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#7e2562] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Barcode className="w-3.5 h-3.5 text-[#7e2562]" />
                ISBN <span className="text-[#e45e34]">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g., 978-0132350884"
                value={isbn}
                onChange={(e) => handleIsbnChange(e.target.value)}
                className="w-full px-3.5 py-2 text-sm font-mono bg-white border border-[#7e2562]/20 rounded-sm focus:ring-2 focus:ring-[#7e2562]/20 focus:border-[#7e2562] outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#7e2562] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Barcode className="w-3.5 h-3.5 text-[#7e2562]" />
                Barcode (Defaults to ISBN)
              </label>
              <input
                type="text"
                placeholder="Defaults to ISBN"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full px-3.5 py-2 text-sm font-mono bg-white border border-[#7e2562]/20 rounded-sm focus:ring-2 focus:ring-[#7e2562]/20 focus:border-[#7e2562] outline-none transition-all"
              />
            </div>
          </div>

          {/* Author & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#7e2562] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-[#7e2562]" />
                Author Name
              </label>
              <input
                type="text"
                placeholder="e.g., Robert C. Martin"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-[#7e2562]/20 rounded-sm focus:ring-2 focus:ring-[#7e2562]/20 focus:border-[#7e2562] outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#7e2562] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[#7e2562]" />
                Category
              </label>
              <Dropdown
                value={selectedCategory}
                onChange={(val) => {
                  setSelectedCategory(val);
                  if (val !== 'Other') {
                    setCustomCategory('');
                  }
                }}
                options={COMMON_CATEGORIES.map((cat) => ({
                  value: cat,
                  label: cat,
                }))}
                placeholder="Select category..."
                selectClassName="!py-2 !rounded-sm border-[#7e2562]/20 text-xs font-semibold"
              />

              <AnimatePresence>
                {selectedCategory === 'Other' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <input
                      type="text"
                      required
                      placeholder="Enter custom category name..."
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs bg-white border border-[#7e2562]/20 rounded-sm focus:ring-2 focus:ring-[#7e2562]/20 focus:border-[#7e2562] outline-none transition-all"
                      autoFocus
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Publisher */}
          <div>
            <label className="block text-xs font-bold text-[#7e2562] uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#7e2562]" />
              Publisher
            </label>
            <input
              type="text"
              placeholder="e.g., Pearson Education, HarperCollins"
              value={publisherName}
              onChange={(e) => setPublisherName(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-[#7e2562]/20 rounded-sm focus:ring-2 focus:ring-[#7e2562]/20 focus:border-[#7e2562] outline-none transition-all"
            />
          </div>

          {/* Pricing & Stock Grid */}
          <div className="p-4 rounded-sm bg-[#faf6f9]/50 border border-[#7e2562]/10 space-y-3">
            <p className="text-xs font-bold text-[#7e2562] uppercase tracking-wider">Pricing & Warehouse Stock</p>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                  Selling Price (₹) <span className="text-[#e45e34]">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  placeholder="₹ 499.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-semibold bg-white border border-[#7e2562]/20 rounded-sm focus:ring-2 focus:ring-[#7e2562]/20 focus:border-[#7e2562] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                  Cost Price (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="₹ 280.00"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-semibold bg-white border border-[#7e2562]/20 rounded-sm focus:ring-2 focus:ring-[#7e2562]/20 focus:border-[#7e2562] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                  Initial Stock Qty
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  placeholder="50"
                  value={initialQuantity}
                  onChange={(e) => setInitialQuantity(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-bold text-neutral-900 bg-white border border-[#7e2562]/20 rounded-sm focus:ring-2 focus:ring-[#7e2562]/20 focus:border-[#7e2562] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                  Low Stock Alert
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  placeholder="15"
                  value={reorderThreshold}
                  onChange={(e) => setReorderThreshold(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-semibold text-neutral-700 bg-white border border-[#7e2562]/20 rounded-sm focus:ring-2 focus:ring-[#7e2562]/20 focus:border-[#7e2562] outline-none"
                />
              </div>
            </div>
            <p className="text-[11px] text-neutral-500 leading-tight">
              Initial stock will be placed immediately in the Central Warehouse, and a restock movement log will be created.
            </p>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-neutral-700 bg-white border border-neutral-200 hover:bg-neutral-50 rounded-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[#7e2562] hover:bg-[#681b50] rounded-sm shadow-sm disabled:opacity-50 transition-all active:scale-95"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Saving Book...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Save to Warehouse</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
