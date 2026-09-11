"use client";

import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApiData } from '@/hooks/useApiData';
import { api } from '@/lib/api';
import { Loader2, Plus, MessageCircle, BarChart3, CheckCircle, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dropdown } from '@/components/Dropdown';

export default function EnquiriesPage() {
  const { user } = useAuth();
  const isCentral = (user?.roles?.some(r => ['SUPER_ADMIN', 'ADMIN', 'CENTRAL_INVENTORY_MANAGER'].includes(r)) || false);

  const [activeTab, setActiveTab] = useState<'LOG' | 'DEMAND'>(isCentral ? 'DEMAND' : 'LOG');

  const { data: enquiries, loading: logLoading } = useApiData<any[]>('/enquiries', []);
  const { data: demandSummary, loading: demandLoading } = useApiData<any[]>('/enquiries/demand-summary', []);
  const { data: catalog } = useApiData<any>(isCreating ? '/catalog/books?limit=100' : null, []);
  const { data: rawInventory } = useApiData<any>(isCreating && user?.branchId ? `/inventory/branch/${user.branchId}?limit=100` : null);

  // Compute Out of Stock Catalog for the specific branch
  const catalogList = catalog?.books || catalog?.items || catalog?.data || (Array.isArray(catalog) ? catalog : []);
  const inventoryList = rawInventory?.items || rawInventory?.data || (Array.isArray(rawInventory) ? rawInventory : []);
  
  const inventoryMap = new Map();
  inventoryList.forEach((inv: any) => {
    if (inv.book && inv.book.id) {
      inventoryMap.set(inv.book.id, inv.quantity);
    }
  });

  const outOfStockCatalog = catalogList.filter((book: any) => {
    const qty = inventoryMap.get(book.id) || 0;
    return qty === 0;
  });

  // Creation State
  const [isCreating, setIsCreating] = useState(false);
  const [enquiryType, setEnquiryType] = useState<'CATALOG' | 'NEW'>('CATALOG');
  const [bookId, setBookId] = useState('');
  const [freeTextTitle, setFreeTextTitle] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewingGroup, setViewingGroup] = useState<any>(null);

  const groupedEnquiries = useMemo(() => {
    const groups: Record<string, { title: string, isCatalog: boolean, items: any[] }> = {};
    (enquiries || []).forEach(enq => {
      const key = enq.book ? `book_${enq.book.id}` : `new_${enq.freeTextTitle}`;
      if (!groups[key]) {
        groups[key] = {
          title: enq.book ? enq.book.title : enq.freeTextTitle,
          isCatalog: !!enq.book,
          items: []
        };
      }
      groups[key].items.push(enq);
    });
    return Object.values(groups);
  }, [enquiries]);

  const handleCreate = async () => {
    try {
      setIsSubmitting(true);
      await api.post('/enquiries', {
        bookId: enquiryType === 'CATALOG' ? bookId : undefined,
        freeTextTitle: enquiryType === 'NEW' ? freeTextTitle : undefined,
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
      });
      setIsCreating(false);
      setBookId(''); setFreeTextTitle(''); setCustomerName(''); setCustomerPhone('');
      alert('Enquiry logged successfully');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to log enquiry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await api.patch(`/enquiries/${id}/status`, { status });
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-sm text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">Open</span>;
      case 'STOCK_REQUESTED': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-sm text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">Stock Requested</span>;
      case 'NEW_TITLE_REQUESTED': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-sm text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">New Title Req</span>;
      case 'FULFILLED': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-sm text-xs font-bold bg-[#f0fbf5] text-[#3cb976] border border-[#3cb976]/30">Fulfilled</span>;
      case 'CLOSED': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-sm text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200">Closed</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Customer Enquiries</h2>
          <p className="text-sm text-gray-500">Track out-of-stock requests and demand signals.</p>
        </div>
      </div>

      <div className="flex space-x-1 border-b border-[#7e2562]/10">
        <button
          onClick={() => setActiveTab('LOG')}
          className={`py-2 px-4 text-sm font-semibold border-b-2 outline-none flex items-center transition-colors ${activeTab === 'LOG' ? 'border-[#7e2562] text-[#7e2562]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
          <MessageCircle className="w-4 h-4 mr-2" /> Enquiry Log
        </button>
        {isCentral && (
          <button
            onClick={() => setActiveTab('DEMAND')}
            className={`py-2 px-4 text-sm font-semibold border-b-2 outline-none flex items-center transition-colors ${activeTab === 'DEMAND' ? 'border-[#7e2562] text-[#7e2562]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            <BarChart3 className="w-4 h-4 mr-2" /> Demand Summary
          </button>
        )}
      </div>

      {activeTab === 'LOG' && (
        <div className="bg-white shadow-xs border border-gray-200 rounded-sm overflow-hidden">
          {logLoading ? (
            <div className="p-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#7e2562]"/></div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-[#faf6f9]/70 text-[11px] font-bold text-[#7e2562] uppercase tracking-wider border-b border-[#7e2562]/10 whitespace-nowrap">
                <tr>
                  <th scope="col" className="px-6 py-3.5 text-left whitespace-nowrap">Requested Item</th>
                  <th scope="col" className="px-6 py-3.5 text-left whitespace-nowrap">Type</th>
                  <th scope="col" className="px-6 py-3.5 text-center whitespace-nowrap">Total Enquiries</th>
                  <th scope="col" className="px-6 py-3.5 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {groupedEnquiries.map((group, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">{group.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {group.isCatalog ? <span className="text-[#7e2562] font-medium">In Catalog (OOS)</span> : <span className="text-purple-600 font-medium">New Title</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-base font-bold text-gray-900">
                      {group.items.length}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-4">
                        <div className="w-40 text-left">
                          <Dropdown
                            value={group.items[0]?.status || ''}
                            onChange={(val) => {
                              if (!val) return;
                              group.items.forEach(enq => {
                                handleStatusUpdate(enq.id, val);
                                enq.status = val; // Optimistic update
                              });
                            }}
                            placeholder="Status..."
                            options={[
                              { value: 'OPEN', label: 'Open' },
                              ...(user?.roles?.some(r => ['BRANCH_MANAGER', 'SUPER_ADMIN', 'ADMIN'].includes(r)) ? [{ value: 'STOCK_REQUESTED', label: 'Stock Req' }] : []),
                              ...(user?.roles?.some(r => ['BRANCH_MANAGER', 'CENTRAL_INVENTORY_MANAGER', 'SUPER_ADMIN', 'ADMIN'].includes(r)) ? [{ value: 'NEW_TITLE_REQUESTED', label: 'New Title Req' }] : []),
                              ...(user?.roles?.some(r => ['BRANCH_FRONT_OFFICE', 'BRANCH_MANAGER', 'SUPER_ADMIN', 'ADMIN'].includes(r)) ? [{ value: 'FULFILLED', label: 'Fulfilled' }] : []),
                              { value: 'CLOSED', label: 'Close' },
                            ]}
                          />
                        </div>
                        <button 
                          onClick={() => setViewingGroup(group)}
                          className="text-[#7e2562] hover:text-[#681b50] font-bold whitespace-nowrap hover:underline"
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {groupedEnquiries.length === 0 && <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">No enquiries found.</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'DEMAND' && isCentral && (
        <div className="bg-white shadow-xs border border-gray-200 rounded-sm overflow-hidden">
          {demandLoading ? (
            <div className="p-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#7e2562]"/></div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-[#faf6f9]/70 text-[11px] font-bold text-[#7e2562] uppercase tracking-wider border-b border-[#7e2562]/10 whitespace-nowrap">
                <tr>
                  <th scope="col" className="px-6 py-3.5 text-left whitespace-nowrap">Item</th>
                  <th scope="col" className="px-6 py-3.5 text-left whitespace-nowrap">Type</th>
                  <th scope="col" className="px-6 py-3.5 text-right whitespace-nowrap">Total Enquiries</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(demandSummary || []).map((ds, i) => (
                  <tr key={i} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">{ds.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {ds.bookId ? <span className="text-[#7e2562] font-medium">Existing Catalog</span> : <span className="text-purple-600 font-medium">Missing/New Title</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-lg text-gray-900">
                      {ds.enquiryCount}
                    </td>
                  </tr>
                ))}
                {demandSummary?.length === 0 && <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-500">No active demand signals.</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Creation Modal */}
      <AnimatePresence>
        {isCreating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-sm shadow-xl w-full max-w-md p-6 border border-[#7e2562]/15">
              <h3 className="text-lg font-bold text-[#7e2562] mb-4 flex items-center"><MessageCircle className="w-5 h-5 mr-2"/> Log Customer Enquiry</h3>
              
              <div className="flex space-x-4 mb-4">
                <label className="flex items-center">
                  <input type="radio" checked={enquiryType === 'CATALOG'} onChange={() => setEnquiryType('CATALOG')} className="text-[#7e2562] focus:ring-[#7e2562]" />
                  <span className="ml-2 text-sm text-gray-700">Catalog Item (OOS)</span>
                </label>
                <label className="flex items-center">
                  <input type="radio" checked={enquiryType === 'NEW'} onChange={() => setEnquiryType('NEW')} className="text-[#7e2562] focus:ring-[#7e2562]" />
                  <span className="ml-2 text-sm text-gray-700">New / Unlisted Item</span>
                </label>
              </div>

              <div className="space-y-4 mb-6">
                {enquiryType === 'CATALOG' ? (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Select Book</label>
                    <Dropdown
                      searchable
                      value={bookId}
                      onChange={(val) => setBookId(val)}
                      placeholder="Search by title, ISBN, or barcode..."
                      options={(outOfStockCatalog).map((b: any) => ({
                        value: b.id,
                        label: b.title,
                        isbn: b.isbn,
                        barcode: b.barcode,
                        sublabel: `ISBN: ${b.isbn || 'N/A'}${b.barcode ? ` • Barcode: ${b.barcode}` : ''}`,
                      }))}
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Book Title / Details</label>
                    <input type="text" value={freeTextTitle} onChange={e => setFreeTextTitle(e.target.value)} placeholder="e.g. Harry Potter" className="block w-full px-3 py-2 border border-gray-300 rounded-sm text-sm focus:border-[#7e2562] focus:ring-1 focus:ring-[#7e2562] outline-none" />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Customer Name</label>
                    <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} className="block w-full px-3 py-2 border border-gray-300 rounded-sm text-sm focus:border-[#7e2562] focus:ring-1 focus:ring-[#7e2562] outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Phone</label>
                    <input type="text" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="block w-full px-3 py-2 border border-gray-300 rounded-sm text-sm focus:border-[#7e2562] focus:ring-1 focus:ring-[#7e2562] outline-none" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button onClick={() => setIsCreating(false)} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-sm hover:bg-gray-50 transition-colors">Cancel</button>
                <button onClick={handleCreate} disabled={isSubmitting || (enquiryType === 'CATALOG' && !bookId) || (enquiryType === 'NEW' && !freeTextTitle)} className="px-4 py-2 text-sm font-semibold text-white bg-[#7e2562] hover:bg-[#681b50] rounded-sm transition-colors disabled:opacity-50">
                  {isSubmitting ? 'Saving...' : 'Save Enquiry'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View Customers Modal */}
      <AnimatePresence>
        {viewingGroup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-sm shadow-xl w-full max-w-4xl flex flex-col max-h-[90vh] border border-[#7e2562]/15">
              <div className="p-6 border-b border-[#7e2562]/10 flex justify-between items-center bg-[#faf6f9] rounded-t-sm">
                <div>
                  <h3 className="text-xl font-bold text-[#7e2562]">{viewingGroup.title}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Customer Enquiries List</p>
                </div>
                <button onClick={() => setViewingGroup(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-[#faf6f9]/70 text-[11px] font-bold text-[#7e2562] uppercase tracking-wider border-b border-[#7e2562]/10 whitespace-nowrap">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left whitespace-nowrap">Customer</th>
                      <th scope="col" className="px-4 py-3 text-left whitespace-nowrap">Branch / Date</th>
                      <th scope="col" className="px-4 py-3 text-center whitespace-nowrap">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {viewingGroup.items.map((enq: any) => (
                      <tr key={enq.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">
                          {enq.customerName || 'Anonymous'}<br/><span className="text-gray-500 text-xs font-normal">{enq.customerPhone || 'No phone'}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {enq.branch?.name}<br/>{new Date(enq.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          {getStatusBadge(enq.status)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t border-gray-100 flex justify-end bg-gray-50 rounded-b-sm">
                <button onClick={() => setViewingGroup(null)} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-sm hover:bg-gray-50 transition-colors">Close</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

