"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApiData } from '@/hooks/useApiData';
import { api } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Dropdown } from '@/components/Dropdown';
import { Loader2, Plus } from 'lucide-react';

export default function PurchaseOrdersPage() {
  const { user } = useAuth();
  const canReceive = user?.roles?.some(r => ['SUPER_ADMIN', 'CENTRAL_INVENTORY_MANAGER', 'ADMIN'].includes(r));
  
  const { data: pos, loading, error } = useApiData<any[]>('/procurement', []);
  const { data: catalog } = useApiData<any>('/catalog/books?limit=1000', []);
  const { data: suppliers } = useApiData<any[]>('/catalog/suppliers', []);

  // Create PO State
  const [isCreating, setIsCreating] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [cart, setCart] = useState<{bookId: string, quantity: number, unitCost: number, title?: string}[]>([]);
  
  const [bookInput, setBookInput] = useState('');
  const [qtyInput, setQtyInput] = useState(10);
  const [costInput, setCostInput] = useState(5.00);

  // Receive PO State
  const [receivingPO, setReceivingPO] = useState<any | null>(null);
  const [receiveData, setReceiveData] = useState<{itemId: string, quantityReceived: number}[]>([]);
  const [receiveStatus, setReceiveStatus] = useState<'RECEIVED' | 'PARTIALLY_RECEIVED'>('RECEIVED');
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    try {
      setIsSubmitting(true);
      await api.post('/procurement', {
        supplierId: selectedSupplier,
        expectedDate: expectedDate || undefined,
        items: cart.map(i => ({ bookId: i.bookId, quantityOrdered: i.quantity, unitCost: i.unitCost }))
      });
      setIsCreating(false);
      setCart([]);
      setSelectedSupplier('');
      setExpectedDate('');
      alert('Purchase Order Created');
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Purchase Orders</h2>
          <p className="text-sm text-gray-500">Manage procurement from external suppliers.</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create PO
        </button>
      </div>

      <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order No</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Cost</th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {(pos || []).map((po) => (
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
                  {po.status === 'DRAFT' && (
                    <button onClick={() => handleStatusUpdate(po.id, 'PLACED')} className="text-blue-600 hover:text-blue-900 mr-3">Place Order</button>
                  )}
                  {(po.status === 'PLACED' || po.status === 'PARTIALLY_RECEIVED') && canReceive && (
                    <button 
                      onClick={() => {
                        setReceivingPO(po);
                        setReceiveData(po.items.map((i: any) => ({ itemId: i.id, quantityReceived: i.quantityOrdered - i.quantityReceived })));
                        setReceiveStatus('RECEIVED');
                      }} 
                      className="text-green-600 hover:text-green-900"
                    >
                      Receive Items
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {pos?.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No purchase orders found.</td></tr>
            )}
          </tbody>
        </table>
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
                    onChange={(val) => setSelectedSupplier(val)}
                    placeholder="Select a supplier..."
                    options={(suppliers || []).map((s: any) => ({
                      value: s.id,
                      label: s.name
                    }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expected Delivery Date (Optional)</label>
                  <input type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} className="block w-full px-3 py-2 border border-gray-300 rounded-lg sm:text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow" />
                </div>
              </div>

              <div className="border-t pt-4 mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Add Items</h4>
                <div className="flex items-end space-x-3 bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Select Book</label>
                    <Dropdown
                      searchable
                      value={bookInput}
                      onChange={(val) => {
                        setBookInput(val);
                        const bookList = catalog?.books || catalog?.items || catalog?.data || (Array.isArray(catalog) ? catalog : []);
                        const book = bookList.find((b: any) => b.id === val);
                        if (book && book.costPrice) {
                          setCostInput(book.costPrice);
                        }
                      }}
                      placeholder="Search and select..."
                      options={(catalog?.books || catalog?.items || catalog?.data || (Array.isArray(catalog) ? catalog : [])).map((b: any) => ({
                        value: b.id,
                        label: `${b.title} (Current Cost: ₹${b.costPrice || 0})`
                      }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Quantity</label>
                    <input type="number" min="1" value={qtyInput} onChange={e => setQtyInput(Number(e.target.value))} placeholder="e.g. 50" className="w-32 block px-4 py-2 border border-gray-300 rounded-lg sm:text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Unit Cost (₹)</label>
                    <input type="number" step="0.01" min="0" value={costInput} onChange={e => setCostInput(Number(e.target.value))} placeholder="e.g. 15.50" className="w-36 block px-4 py-2 border border-gray-300 rounded-lg sm:text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow" />
                  </div>
                  <button 
                    onClick={() => {
                      if (bookInput && qtyInput > 0 && costInput >= 0) {
                        const bookList = catalog?.books || catalog?.items || catalog?.data || (Array.isArray(catalog) ? catalog : []);
                        const book = bookList.find((b: any) => b.id === bookInput);
                        setCart([...cart, { bookId: bookInput, quantity: qtyInput, unitCost: costInput, title: book?.title }]);
                        setBookInput('');
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                  >Add to Order</button>
                </div>
              </div>

              <div className="border rounded-lg max-h-48 overflow-y-auto mb-6">
                <table className="min-w-full divide-y divide-gray-200">
                  <tbody className="bg-white divide-y divide-gray-200">
                    {cart.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.title}</td>
                        <td className="px-4 py-2 text-sm text-right font-medium">{item.quantity} qty</td>
                        <td className="px-4 py-2 text-sm text-right text-gray-500">@ ₹{item.unitCost.toFixed(2)}</td>
                        <td className="px-4 py-2 text-sm text-right font-bold">₹{(item.quantity * item.unitCost).toFixed(2)}</td>
                        <td className="px-4 py-2 text-right">
                          <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="text-red-500 text-xs">Remove</button>
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
                  <button onClick={() => setIsCreating(false)} className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-200 outline-none transition-all shadow-sm">Cancel</button>
                  <button onClick={handleCreate} disabled={cart.length === 0 || !selectedSupplier || isSubmitting} className="inline-flex items-center px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm">
                    {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
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
              
              <div className="max-h-64 overflow-y-auto mb-6 border rounded-lg">
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
                <button onClick={() => setReceivingPO(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button 
                  onClick={() => handleStatusUpdate(receivingPO.id, receiveStatus, receiveData)} 
                  disabled={isSubmitting} 
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
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

