"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApiData } from '@/hooks/useApiData';
import { api } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Dropdown } from '@/components/Dropdown';
import { Pagination } from '@/components/Pagination';
import { matchKeywords } from '@/lib/searchUtils';
import { Loader2, Plus, Send, PackageCheck, CheckCircle2, ShoppingBag, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

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

export default function PurchaseOrdersPage() {
  const { user } = useAuth();
  const canReceive = user?.roles?.some(r => ['SUPER_ADMIN', 'CENTRAL_INVENTORY_MANAGER', 'ADMIN'].includes(r));
  
  const { data: pos, loading, error } = useApiData<any[]>('/procurement', []);
  const { data: catalog } = useApiData<any>('/catalog/books?limit=1000', []);
  const { data: suppliers } = useApiData<any[]>('/catalog/suppliers', []);
  const { data: pmsTitles } = useApiData<any[]>('/pms/titles', []);

  // Create PO State
  const [isCreating, setIsCreating] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [customSupplier, setCustomSupplier] = useState('');
  const [expectedDate, setExpectedDate] = useState('');

  const selectedSupplierObj = (suppliers || []).find((s: any) => s.id === selectedSupplier);
  const isKairaliSupplier = 
    selectedSupplierObj?.name?.toLowerCase().includes('kairali') ||
    customSupplier.toLowerCase().includes('kairali');
  
  interface POCartItem {
    bookId?: string;
    isNewBook?: boolean;
    isPmsBook?: boolean;
    pmsTitle?: any;
    newBook?: {
      title: string;
      isbn: string;
      barcode?: string;
      authorName?: string;
      categoryName?: string;
      publisherName?: string;
      price?: number;
    };
    title: string;
    quantity: number;
    unitCost: number;
  }
  const [cart, setCart] = useState<POCartItem[]>([]);
  
  // Existing item state
  const [itemMode, setItemMode] = useState<'EXISTING' | 'NEW'>('EXISTING');
  const [bookInput, setBookInput] = useState('');
  const [qtyInput, setQtyInput] = useState(10);
  const [costInput, setCostInput] = useState(5.00);

  // New item inline state
  const [newTitle, setNewTitle] = useState('');
  const [newIsbn, setNewIsbn] = useState('');
  const [newBarcode, setNewBarcode] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Technology & Programming');
  const [customCategory, setCustomCategory] = useState('');
  const [newPublisher, setNewPublisher] = useState('');
  const [newSellingPrice, setNewSellingPrice] = useState<number | ''>('');

  // Receive PO State
  const [receivingPO, setReceivingPO] = useState<any | null>(null);
  const [receiveData, setReceiveData] = useState<{itemId: string, quantityReceived: number}[]>([]);
  const [receiveStatus, setReceiveStatus] = useState<'RECEIVED' | 'PARTIALLY_RECEIVED'>('RECEIVED');

  // Search & Sorting State
  const [searchTerm, setSearchTerm] = useState('');
  type POSortField = 'date' | 'orderNumber' | 'supplier' | 'totalCost' | 'status';
  type POSortDirection = 'asc' | 'desc';
  const [sortField, setSortField] = useState<POSortField>('date');
  const [sortDirection, setSortDirection] = useState<POSortDirection>('desc');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const toggleSort = (field: POSortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'totalCost' || field === 'date' ? 'desc' : 'asc');
    }
  };
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!selectedSupplier) {
      alert('Please select a supplier');
      return;
    }
    if (selectedSupplier === 'OTHER' && !customSupplier.trim()) {
      alert('Please enter the supplier name');
      return;
    }
    if (cart.length === 0) {
      alert('Please add at least one item to the order');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post('/procurement', {
        supplierId: selectedSupplier === 'OTHER' ? undefined : selectedSupplier,
        supplierName: selectedSupplier === 'OTHER' ? customSupplier.trim() : undefined,
        expectedDate: expectedDate || undefined,
        items: cart.map(i => ({ 
          bookId: i.bookId, 
          newBook: i.newBook, 
          pmsTitle: i.pmsTitle,
          quantityOrdered: i.quantity, 
          unitCost: i.unitCost 
        }))
      });
      setIsCreating(false);
      setCart([]);
      setSelectedSupplier('');
      setCustomSupplier('');
      setExpectedDate('');
      alert('Purchase Order Created Successfully');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create PO');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: string, items?: any[]) => {
    try {
      setIsSubmitting(true);
      await api.patch(`/procurement/${id}/receive`, {
        status,
        items
      });
      if (status === 'RECEIVED' || status === 'PARTIALLY_RECEIVED') {
        setReceivingPO(null);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update PO');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Draft</span>;
      case 'PLACED': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Placed</span>;
      case 'PARTIALLY_RECEIVED': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Partial</span>;
      case 'RECEIVED': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Received</span>;
      case 'CANCELLED': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Cancelled</span>;
      default: return null;
    }
  };

  if (loading && (!pos || pos.length === 0)) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }

  const filteredPOs = (pos || []).filter((po: any) => {
    const bookTitles = po.items?.map((i: any) => i.book?.title || i.title || '').join(' ') || '';
    const isbns = po.items?.map((i: any) => i.book?.isbn || i.isbn || '').join(' ') || '';
    return matchKeywords(
      searchTerm,
      po.orderNumber,
      po.supplier?.name,
      po.status,
      bookTitles,
      isbns
    );
  });

  const sortedPOs = [...filteredPOs].sort((a: any, b: any) => {
    let comparison = 0;
    if (sortField === 'date') {
      comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    } else if (sortField === 'orderNumber') {
      comparison = (a.orderNumber || '').localeCompare(b.orderNumber || '');
    } else if (sortField === 'supplier') {
      comparison = (a.supplier?.name || '').localeCompare(b.supplier?.name || '');
    } else if (sortField === 'totalCost') {
      comparison = Number(a.totalCost || 0) - Number(b.totalCost || 0);
    } else if (sortField === 'status') {
      const statusOrder: Record<string, number> = {
        DRAFT: 0,
        PLACED: 1,
        PARTIALLY_RECEIVED: 2,
        RECEIVED: 3,
        CANCELLED: 4,
      };
      comparison = (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const paginatedPOs = sortedPOs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Purchase Orders</h2>
          <p className="text-sm text-gray-500">Manage procurement from external suppliers.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-neutral-400" />
            </div>
            <input
              type="text"
              placeholder="Search PO #, supplier, book, keywords..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="block w-full pl-10 pr-3 py-2 border border-neutral-300 rounded-xl focus:ring-black focus:border-black text-sm"
            />
          </div>

          <div className="w-52 shrink-0">
            <Dropdown
              value={`${sortField}_${sortDirection}`}
              onChange={(val) => {
                const [f, d] = val.split('_') as [POSortField, POSortDirection];
                setSortField(f);
                setSortDirection(d);
              }}
              options={[
                { value: 'date_desc', label: 'Date: Newest First' },
                { value: 'date_asc', label: 'Date: Oldest First' },
                { value: 'totalCost_desc', label: 'Cost: High-Low' },
                { value: 'totalCost_asc', label: 'Cost: Low-High' },
                { value: 'status_asc', label: 'Needs Action First' },
                // { value: 'supplier_asc', label: 'Supplier: A-Z' },
                // { value: 'orderNumber_asc', label: 'Order #: A-Z' },
              ]}
              selectClassName="!py-2 !rounded-xl !text-xs font-bold border-neutral-300 bg-white"
            />
          </div>

          <button
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-black hover:bg-neutral-800 rounded-xl shadow-sm active:scale-95 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            Create PO
          </button>
        </div>
      </div>

      <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                scope="col" 
                onClick={() => toggleSort('orderNumber')}
                className="group px-6 py-3 text-left text-xs font-bold text-neutral-600 uppercase tracking-wider cursor-pointer select-none hover:bg-neutral-100/80 hover:text-black transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Order No / Date</span>
                  {sortField === 'orderNumber' || sortField === 'date' ? (
                    sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-black font-bold" /> : <ArrowDown className="w-3.5 h-3.5 text-black font-bold" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-neutral-400 opacity-50 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
              </th>
              <th 
                scope="col" 
                onClick={() => toggleSort('supplier')}
                className="group px-6 py-3 text-left text-xs font-bold text-neutral-600 uppercase tracking-wider cursor-pointer select-none hover:bg-neutral-100/80 hover:text-black transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Supplier</span>
                  {sortField === 'supplier' ? (
                    sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-black font-bold" /> : <ArrowDown className="w-3.5 h-3.5 text-black font-bold" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-neutral-400 opacity-50 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
              </th>
              <th 
                scope="col" 
                onClick={() => toggleSort('totalCost')}
                className="group px-6 py-3 text-right text-xs font-bold text-neutral-600 uppercase tracking-wider cursor-pointer select-none hover:bg-neutral-100/80 hover:text-black transition-colors"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Total Cost</span>
                  {sortField === 'totalCost' ? (
                    sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-black font-bold" /> : <ArrowDown className="w-3.5 h-3.5 text-black font-bold" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-neutral-400 opacity-50 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
              </th>
              <th 
                scope="col" 
                onClick={() => toggleSort('status')}
                className="group px-6 py-3 text-center text-xs font-bold text-neutral-600 uppercase tracking-wider cursor-pointer select-none hover:bg-neutral-100/80 hover:text-black transition-colors"
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span>Status</span>
                  {sortField === 'status' ? (
                    sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-black font-bold" /> : <ArrowDown className="w-3.5 h-3.5 text-black font-bold" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-neutral-400 opacity-50 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-neutral-600 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedPOs.map((po) => (
              <tr key={po.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-bold text-gray-900">{po.orderNumber}</div>
                  <div className="text-xs text-gray-500">{new Date(po.createdAt).toLocaleDateString()}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {po.supplier?.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right text-gray-900">
                  ₹{Number(po.totalCost).toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  {getStatusBadge(po.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2">
                    {po.status === 'DRAFT' && (
                      <button 
                        onClick={() => handleStatusUpdate(po.id, 'PLACED')} 
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-black hover:bg-neutral-800 rounded-xl shadow-sm active:scale-95 transition-all"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Place Order
                      </button>
                    )}
                    {(po.status === 'PLACED' || po.status === 'PARTIALLY_RECEIVED') && canReceive && (
                      <button 
                        onClick={() => {
                          setReceivingPO(po);
                          setReceiveData(po.items.map((i: any) => ({ itemId: i.id, quantityReceived: i.quantityOrdered - i.quantityReceived })));
                          setReceiveStatus('RECEIVED');
                        }} 
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm active:scale-95 transition-all"
                      >
                        <PackageCheck className="w-3.5 h-3.5" />
                        Receive Items
                      </button>
                    )}
                    {po.status === 'RECEIVED' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-xl border border-emerald-200/60">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Fulfilled
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {sortedPOs.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500 text-sm">No purchase orders found matching your criteria.</td></tr>
            )}
          </tbody>
        </table>

        <Pagination
          currentPage={currentPage}
          totalItems={sortedPOs.length}
          pageSize={pageSize}
          onPageChange={(page) => setCurrentPage(page)}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* Creation Modal */}
      <AnimatePresence>
        {isCreating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-xl shadow-xl w-full max-w-3xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Create Purchase Order</h3>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                  <Dropdown
                    value={selectedSupplier}
                    onChange={(val) => {
                      setSelectedSupplier(val);
                      if (val !== 'OTHER') {
                        setCustomSupplier('');
                      }
                    }}
                    placeholder="Select a supplier..."
                    options={[
                      ...(suppliers || []).map((s: any) => ({
                        value: s.id,
                        label: s.name,
                      })),
                      { value: 'OTHER', label: 'Other (New Supplier)' },
                    ]}
                  />
                  <AnimatePresence>
                    {selectedSupplier === 'OTHER' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <input
                          type="text"
                          required
                          placeholder="Enter supplier / distributor name..."
                          value={customSupplier}
                          onChange={(e) => setCustomSupplier(e.target.value)}
                          className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none transition-all"
                          autoFocus
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expected Delivery Date (Optional)</label>
                  <input type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} className="block w-full px-3 py-2 border border-gray-300 rounded-lg sm:text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow" />
                </div>
              </div>

              <div className="border-t pt-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-gray-800">Add Items to Order</h4>
                    {isKairaliSupplier && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        🌟 Kairali Books (PMS In-House Titles)
                      </span>
                    )}
                  </div>
                  {!isKairaliSupplier && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setItemMode('EXISTING')}
                        className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
                          itemMode === 'EXISTING'
                            ? 'bg-black text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Existing Book
                      </button>
                      <button
                        type="button"
                        onClick={() => setItemMode('NEW')}
                        className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                          itemMode === 'NEW'
                            ? 'bg-black text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        New Book Title
                      </button>
                    </div>
                  )}
                </div>

                {itemMode === 'EXISTING' || isKairaliSupplier ? (
                  <div className="flex items-end space-x-3 bg-gray-50 p-4 rounded-xl border border-gray-200/80">
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        {isKairaliSupplier ? 'Select Book Printed via PMS' : 'Select Book'}
                      </label>
                      <Dropdown
                        searchable
                        value={bookInput}
                        onChange={(val) => {
                          setBookInput(val);
                          if (isKairaliSupplier) {
                            const pmsBook = (pmsTitles || []).find((b: any) => b.pmsTitleId === val);
                            if (pmsBook) {
                              setCostInput(pmsBook.costPrice || 0);
                            } else {
                              setCostInput(0);
                            }
                          } else {
                            const bookList = catalog?.books || catalog?.items || catalog?.data || (Array.isArray(catalog) ? catalog : []);
                            const book = bookList.find((b: any) => b.id === val);
                            if (book) {
                              const fixedCost = book.costPrice !== null && book.costPrice !== undefined ? Number(book.costPrice) : (Number(book.price) ? Number(book.price) * 0.6 : 0);
                              setCostInput(fixedCost);
                            } else {
                              setCostInput(0);
                            }
                          }
                        }}
                        placeholder={isKairaliSupplier ? "Search PMS books by title or ISBN..." : "Search by title, ISBN, or barcode..."}
                        options={(isKairaliSupplier ? (pmsTitles || []) : (catalog?.books || catalog?.items || catalog?.data || (Array.isArray(catalog) ? catalog : []))).map((b: any) => {
                          if (isKairaliSupplier) {
                            return {
                              value: b.pmsTitleId,
                              label: b.title + (b.titleMl ? ` (${b.titleMl})` : ''),
                              isbn: b.isbn,
                              barcode: b.isbn,
                              sublabel: `Author: ${b.authorName || 'N/A'} • ISBN: ${b.isbn || 'N/A'} • MRP: ₹${b.price} • Print Cost: ₹${b.costPrice} • Printed Stock: ${b.pmsStock}`,
                            };
                          }
                          return {
                            value: b.id,
                            label: b.title,
                            isbn: b.isbn,
                            barcode: b.barcode,
                            sublabel: `ISBN: ${b.isbn || 'N/A'}${b.barcode ? ` • Barcode: ${b.barcode}` : ''} • Fixed Cost: ₹${b.costPrice || 0}`,
                          };
                        })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Quantity</label>
                      <input type="number" min="1" value={qtyInput} onChange={e => setQtyInput(Number(e.target.value))} placeholder="e.g. 50" className="w-28 block px-3.5 py-2 border border-gray-300 rounded-xl sm:text-sm text-gray-900 bg-white focus:ring-2 focus:ring-black focus:border-black outline-none transition-shadow font-semibold" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-gray-600">Unit Cost (₹)</label>
                        <span className="text-[10px] text-gray-400 font-medium">Fixed</span>
                      </div>
                      <input 
                        type="text" 
                        readOnly 
                        disabled 
                        value={`₹ ${Number(costInput).toFixed(2)}`} 
                        title={isKairaliSupplier ? "Unit cost is fixed to PMS printing unit cost" : "Unit cost is fixed to this book's catalog cost price"}
                        className="w-32 block px-3.5 py-2 border border-gray-200 rounded-xl sm:text-sm text-gray-700 bg-gray-100 cursor-not-allowed font-semibold outline-none select-none" 
                      />
                    </div>
                    <button 
                      type="button"
                      disabled={!bookInput || qtyInput <= 0}
                      onClick={() => {
                        if (bookInput && qtyInput > 0) {
                          if (isKairaliSupplier) {
                            const pmsBook = (pmsTitles || []).find((b: any) => b.pmsTitleId === bookInput);
                            setCart([...cart, { 
                              isPmsBook: true,
                              pmsTitle: pmsBook,
                              quantity: qtyInput, 
                              unitCost: Number(costInput) || (pmsBook?.costPrice || 0), 
                              title: pmsBook?.title || 'Kairali Book' 
                            }]);
                          } else {
                            const bookList = catalog?.books || catalog?.items || catalog?.data || (Array.isArray(catalog) ? catalog : []);
                            const book = bookList.find((b: any) => b.id === bookInput);
                            const finalCost = book?.costPrice !== null && book?.costPrice !== undefined ? Number(book.costPrice) : Number(costInput) || 0;
                            setCart([...cart, { 
                              bookId: bookInput, 
                              isNewBook: false, 
                              quantity: qtyInput, 
                              unitCost: finalCost, 
                              title: book?.title || 'Selected Book' 
                            }]);
                          }
                          setBookInput('');
                          setCostInput(0);
                        }
                      }}
                      className="px-4 py-2 bg-black hover:bg-neutral-900 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                    >Add to Order</button>
                  </div>
                ) : (
                  <div className="bg-blue-50/40 p-4 rounded-2xl border border-blue-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-blue-900 uppercase tracking-wider">New Title Details</p>
                      <span className="text-[11px] text-blue-600 font-medium">Will be registered in catalog & received into warehouse</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Title <span className="text-rose-500">*</span></label>
                        <input
                          type="text"
                          placeholder="e.g., Designing Data-Intensive Applications"
                          value={newTitle}
                          onChange={e => setNewTitle(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">ISBN <span className="text-rose-500">*</span></label>
                        <input
                          type="text"
                          placeholder="e.g., 978-1449373320"
                          value={newIsbn}
                          onChange={e => {
                            setNewIsbn(e.target.value);
                            if (!newBarcode || newBarcode === newIsbn) setNewBarcode(e.target.value);
                          }}
                          className="w-full px-3 py-2 text-xs font-mono bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Author Name</label>
                        <input
                          type="text"
                          placeholder="e.g., Martin Kleppmann"
                          value={newAuthor}
                          onChange={e => setNewAuthor(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Category</label>
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
                          selectClassName="!py-2 !rounded-xl !text-xs font-medium"
                        />
                        <AnimatePresence>
                          {selectedCategory === 'Other' && (
                            <motion.div
                              initial={{ opacity: 0, height: 0, marginTop: 0 }}
                              animate={{ opacity: 1, height: 'auto', marginTop: 6 }}
                              exit={{ opacity: 0, height: 0, marginTop: 0 }}
                              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                              className="overflow-hidden"
                            >
                              <input
                                type="text"
                                required
                                placeholder="Specify category..."
                                value={customCategory}
                                onChange={(e) => setCustomCategory(e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none"
                                autoFocus
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Publisher</label>
                        <input
                          type="text"
                          placeholder="e.g., O'Reilly Media"
                          value={newPublisher}
                          onChange={e => setNewPublisher(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end pt-1">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Selling Price (₹)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="₹ 999.00"
                          value={newSellingPrice}
                          onChange={e => setNewSellingPrice(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full px-3 py-2 text-xs font-semibold bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Unit Cost (₹) <span className="text-rose-500">*</span></label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="₹ 650.00"
                          value={costInput}
                          onChange={e => setCostInput(Number(e.target.value))}
                          className="w-full px-3 py-2 text-xs font-semibold bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Qty Ordered <span className="text-rose-500">*</span></label>
                        <input
                          type="number"
                          min="1"
                          placeholder="50"
                          value={qtyInput}
                          onChange={e => setQtyInput(Number(e.target.value))}
                          className="w-full px-3 py-2 text-xs font-bold text-gray-900 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (!newTitle.trim() || !newIsbn.trim()) {
                            alert('Title and ISBN are required for new book');
                            return;
                          }
                          if (qtyInput <= 0 || costInput < 0) {
                            alert('Please enter valid quantity and unit cost');
                            return;
                          }
                          const finalCategory = selectedCategory === 'Other' ? customCategory.trim() : selectedCategory;
                          if (selectedCategory === 'Other' && !finalCategory) {
                            alert('Please enter the custom category name');
                            return;
                          }
                          setCart([
                            ...cart,
                            {
                              isNewBook: true,
                              title: newTitle.trim(),
                              quantity: qtyInput,
                              unitCost: costInput,
                              newBook: {
                                title: newTitle.trim(),
                                isbn: newIsbn.trim(),
                                barcode: (newBarcode.trim() || newIsbn.trim()),
                                authorName: newAuthor.trim() || undefined,
                                categoryName: finalCategory || undefined,
                                publisherName: newPublisher.trim() || undefined,
                                price: newSellingPrice !== '' ? Number(newSellingPrice) : undefined,
                              }
                            }
                          ]);
                          // Clear new book inputs
                          setNewTitle('');
                          setNewIsbn('');
                          setNewBarcode('');
                          setNewAuthor('');
                          setSelectedCategory('Technology & Programming');
                          setCustomCategory('');
                          setNewPublisher('');
                          setNewSellingPrice('');
                        }}
                        className="w-full py-2 bg-black hover:bg-neutral-900 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5 text-white" />
                        Add New Title
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="border border-slate-200 rounded-2xl max-h-48 overflow-y-auto mb-6 bg-slate-50/40">
                <table className="min-w-full divide-y divide-gray-200">
                  <tbody className="bg-white divide-y divide-gray-100">
                    {cart.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="px-4 py-2.5 text-xs text-gray-900 font-semibold">
                          <div className="flex items-center gap-2">
                            <span>{item.title}</span>
                            {item.isPmsBook && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                KAIRALI BOOKS (PMS)
                              </span>
                            )}
                            {item.isNewBook && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                NEW TITLE
                              </span>
                            )}
                          </div>
                          {item.pmsTitle?.isbn && (
                            <div className="text-[11px] text-emerald-700 font-mono">ISBN: {item.pmsTitle.isbn} • Author: {item.pmsTitle.authorName}</div>
                          )}
                          {item.newBook?.isbn && (
                            <div className="text-[11px] text-gray-500 font-mono">ISBN: {item.newBook.isbn}</div>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-right font-medium text-gray-700">{item.quantity} units</td>
                        <td className="px-4 py-2.5 text-xs text-right text-gray-500">@ ₹{item.unitCost.toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-xs text-right font-bold text-gray-900">₹{(item.quantity * item.unitCost).toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right">
                          <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="text-rose-600 hover:text-rose-800 text-xs font-bold px-2 py-1 rounded hover:bg-rose-50 transition-colors">Remove</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="flex justify-between items-center border-t border-gray-200 pt-5 mt-4">
                <div className="text-xl font-extrabold text-gray-900">
                  Total: <span className="text-blue-600">₹{cart.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0).toFixed(2)}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <button onClick={() => setIsCreating(false)} className="px-5 py-2.5 text-sm font-semibold text-neutral-700 bg-white border border-neutral-300 rounded-xl hover:bg-neutral-50 active:scale-95 transition-all shadow-sm">Cancel</button>
                  <button onClick={handleCreate} disabled={cart.length === 0 || !selectedSupplier || isSubmitting} className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-black hover:bg-neutral-900 rounded-xl shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Save Draft PO
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Receive Modal */}
      <AnimatePresence>
        {receivingPO && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Receive Purchase Order</h3>
              <p className="text-sm text-gray-500 mb-4">{receivingPO.orderNumber}</p>
              
              <div className="max-h-64 overflow-y-auto mb-6 border rounded-xl">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Book</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Ordered</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Prev Received</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Receive Now</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {receivingPO.items.map((item: any) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3 text-sm text-gray-900">{item.book?.title}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium">{item.quantityOrdered}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-500">{item.quantityReceived}</td>
                        <td className="px-4 py-3 text-right">
                          <input 
                            type="number" min="0" max={item.quantityOrdered - item.quantityReceived}
                            value={receiveData.find(r => r.itemId === item.id)?.quantityReceived || 0}
                            onChange={(e) => setReceiveData(prev => prev.map(r => r.itemId === item.id ? { ...r, quantityReceived: Number(e.target.value) } : r))}
                            className="w-20 text-right px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Final Status</label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input type="radio" name="status" value="RECEIVED" checked={receiveStatus === 'RECEIVED'} onChange={() => setReceiveStatus('RECEIVED')} className="h-4 w-4 text-blue-600" />
                    <span className="ml-2 text-sm text-gray-700">Fully Received (Closes PO)</span>
                  </label>
                  <label className="flex items-center">
                    <input type="radio" name="status" value="PARTIALLY_RECEIVED" checked={receiveStatus === 'PARTIALLY_RECEIVED'} onChange={() => setReceiveStatus('PARTIALLY_RECEIVED')} className="h-4 w-4 text-blue-600" />
                    <span className="ml-2 text-sm text-gray-700">Partially Received (Keep Open)</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button onClick={() => setReceivingPO(null)} className="px-4 py-2 text-sm font-semibold text-neutral-700 bg-white border border-neutral-300 rounded-xl hover:bg-neutral-50 active:scale-95 transition-all">Cancel</button>
                <button 
                  onClick={() => handleStatusUpdate(receivingPO.id, receiveStatus, receiveData)} 
                  disabled={isSubmitting} 
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm active:scale-95 disabled:opacity-50 transition-all"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirm Receipt
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

