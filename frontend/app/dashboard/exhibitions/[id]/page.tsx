"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { 
  Loader2, Tent, ShoppingCart, Plus, Calendar, MapPin, CheckCircle2, 
  AlertTriangle, DollarSign, BookOpen, Send, ArchiveRestore, RefreshCw,
  Clock, ArrowLeft, ChevronRight, FileText, Check, AlertCircle, XCircle, Receipt
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LiveExhibitionWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const exhibitionId = params?.id as string;

  const tabFromUrl = (searchParams?.get('tab') || 'POS').toUpperCase() as any;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'POS' | 'STOCK' | 'BILLS' | 'DAY_CLOSE' | 'TOPUP' | 'CREDIT'>(tabFromUrl);

  useEffect(() => {
    if (tabFromUrl) setActiveTab(tabFromUrl);
  }, [tabFromUrl]);

  // POS State
  const [posBooks, setPosBooks] = useState<any[]>([]);
  const [cart, setCart] = useState<{ bookId: string; title: string; price: number; quantity: number; available: number }[]>([]);
  const [posCustomerName, setPosCustomerName] = useState('');
  const [posCustomerPhone, setPosCustomerPhone] = useState('');
  const [posPaymentMethod, setPosPaymentMethod] = useState<'CASH' | 'UPI'>('CASH');
  const [posDiscount, setPosDiscount] = useState(0);
  const [submittingPos, setSubmittingPos] = useState(false);
  const [posSuccessMsg, setPosSuccessMsg] = useState('');

  // Day Close State
  const [countedCash, setCountedCash] = useState('');
  const [dayCloseNote, setDayCloseNote] = useState('');
  const [submittingClose, setSubmittingClose] = useState(false);
  const [dayCloseSuccess, setDayCloseSuccess] = useState('');

  // Topup State
  const [topUpSource, setTopUpSource] = useState<'WAREHOUSE' | 'BRANCH'>('WAREHOUSE');
  const [topUpItems, setTopUpItems] = useState<{ bookId: string; quantity: number }[]>([]);
  const [submittingTopup, setSubmittingTopup] = useState(false);
  const [topupSuccess, setTopupSuccess] = useState('');

  const fetchWorkspaceData = async () => {
    if (!exhibitionId) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/exhibitions/${exhibitionId}/dashboard`);
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.message || 'Failed to load exhibition details.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error loading live exhibition workspace.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaceData();
  }, [exhibitionId]);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-[#7e2562]" />
        <p className="text-sm font-semibold text-gray-500">Loading Live Exhibition Workspace...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <button 
          onClick={() => router.push('/dashboard/exhibitions')}
          className="mb-4 inline-flex items-center text-xs font-semibold text-gray-600 hover:text-[#7e2562]"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Exhibitions List
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <h3 className="text-base font-bold text-red-900">Workspace Unavailable</h3>
          <p className="text-xs text-red-700">{error || 'Exhibition not found.'}</p>
        </div>
      </div>
    );
  }

  const { exhibition, metrics, dayCloses } = data;
  const isLead = exhibition?.assignedUserId === user?.id || ['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER'].includes(user?.role || '');

  // POS Add to Cart
  const handleAddToCart = (stockItem: any) => {
    const available = (stockItem.quantityTaken || 0) + (stockItem.quantityTopUp || 0) - (stockItem.quantitySold || 0) - (stockItem.quantityReturned || 0);
    if (available <= 0) return;

    const existingIndex = cart.findIndex(c => c.bookId === stockItem.bookId);
    if (existingIndex > -1) {
      const updated = [...cart];
      if (updated[existingIndex].quantity < available) {
        updated[existingIndex].quantity += 1;
        setCart(updated);
      }
    } else {
      setCart([...cart, {
        bookId: stockItem.bookId,
        title: stockItem.book?.title || 'Book',
        price: Number(stockItem.book?.price || 0),
        quantity: 1,
        available
      }]);
    }
  };

  // Submit Venue Bill (POS)
  const handleCheckoutPOS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    setSubmittingPos(true);
    setPosSuccessMsg('');
    try {
      const payload = {
        exhibitionId,
        customerName: posCustomerName.trim() || 'Walk-in Customer',
        customerPhone: posCustomerPhone.trim() || undefined,
        paymentMethod: posPaymentMethod,
        discountAmount: Number(posDiscount) || 0,
        items: cart.map(item => ({
          bookId: item.bookId,
          quantity: item.quantity,
          unitPrice: item.price
        }))
      };

      const res = await api.post('/billing', payload);
      if (res.success) {
        setPosSuccessMsg(`Bill #${res.data?.billNumber || 'created'} generated successfully!`);
        setCart([]);
        setPosCustomerName('');
        setPosCustomerPhone('');
        fetchWorkspaceData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Billing failed.');
    } finally {
      setSubmittingPos(false);
    }
  };

  // Submit Day Close
  const handleDayCloseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingClose(true);
    setDayCloseSuccess('');
    try {
      const payload = {
        closeDate: new Date().toISOString().split('T')[0],
        countedCash: Number(countedCash) || 0,
        note: dayCloseNote.trim() || undefined
      };

      const res = await api.post(`/exhibitions/${exhibitionId}/day-close`, payload);
      if (res.success) {
        setDayCloseSuccess('Day close submitted successfully!');
        setCountedCash('');
        setDayCloseNote('');
        fetchWorkspaceData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Day close failed.');
    } finally {
      setSubmittingClose(false);
    }
  };

  const totalCartAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0) - (Number(posDiscount) || 0);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => router.push('/dashboard/exhibitions')}
          className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-[#7e2562] transition"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Exhibitions List
        </button>
        <span className="inline-flex items-center px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 rounded-full animate-pulse">
          <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5"></span> LIVE OPERATING SURFACE
        </span>
      </div>

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#7e2562] to-[#541440] rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase bg-white/20 px-2.5 py-0.5 rounded text-pink-100 tracking-wider">
                {exhibition.status}
              </span>
              <span className="text-xs text-pink-200 flex items-center gap-1 font-mono">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(exhibition.startDate).toLocaleDateString()} — {new Date(exhibition.endDate).toLocaleDateString()}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black mt-1">{exhibition.name}</h1>
            <p className="text-xs text-pink-200 flex items-center gap-2 mt-1">
              <MapPin className="w-3.5 h-3.5" /> {exhibition.location}
              <span>•</span>
              Source: <strong>{exhibition.sourceBranch?.name || 'Central Warehouse'}</strong>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={fetchWorkspaceData}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-xs font-bold transition flex items-center gap-1"
            >
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Live Revenue</span>
          <span className="text-xl font-black text-emerald-600 mt-1 block">
            ₹{Number(metrics?.totalRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-gray-400 mt-0.5 block">Cash: ₹{metrics?.cashTotal || 0} | UPI: ₹{metrics?.upiTotal || 0}</span>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Copies Taken</span>
          <span className="text-xl font-black text-slate-800 mt-1 block">{metrics?.totalDispatched || 0}</span>
          <span className="text-[10px] text-gray-400 mt-0.5 block">Includes top-ups</span>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Copies Sold</span>
          <span className="text-xl font-black text-[#7e2562] mt-1 block">{metrics?.totalSold || 0}</span>
          <span className="text-[10px] text-gray-400 mt-0.5 block">Live decremented</span>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Available Venue Stock</span>
          <span className="text-xl font-black text-indigo-600 mt-1 block">{metrics?.totalRemaining || 0}</span>
          <span className="text-[10px] text-gray-400 mt-0.5 block">Ready for billing</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200 gap-2 overflow-x-auto pb-1">
        <button 
          onClick={() => { setActiveTab('POS'); router.push(`/dashboard/exhibitions/${exhibitionId}?tab=POS`); }}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition flex items-center gap-1.5 ${
            activeTab === 'POS' 
              ? 'bg-[#7e2562] text-white shadow-sm' 
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <ShoppingCart className="w-4 h-4" /> Live POS Billing
        </button>
        <button 
          onClick={() => { setActiveTab('STOCK'); router.push(`/dashboard/exhibitions/${exhibitionId}?tab=STOCK`); }}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition flex items-center gap-1.5 ${
            activeTab === 'STOCK' 
              ? 'bg-[#7e2562] text-white shadow-sm' 
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <BookOpen className="w-4 h-4" /> Stock Levels ({exhibition.stock?.length || 0})
        </button>
        <button 
          onClick={() => { setActiveTab('BILLS'); router.push(`/dashboard/exhibitions/${exhibitionId}?tab=BILLS`); }}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition flex items-center gap-1.5 ${
            activeTab === 'BILLS' 
              ? 'bg-[#7e2562] text-white shadow-sm' 
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Receipt className="w-4 h-4" /> Venue Invoices
        </button>
        <button 
          onClick={() => { setActiveTab('TOPUP'); router.push(`/dashboard/exhibitions/${exhibitionId}?tab=TOPUP`); }}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition flex items-center gap-1.5 ${
            activeTab === 'TOPUP' 
              ? 'bg-[#7e2562] text-white shadow-sm' 
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Send className="w-4 h-4" /> Mid-Event TopUp
        </button>
        <button 
          onClick={() => { setActiveTab('CREDIT'); router.push(`/dashboard/exhibitions/${exhibitionId}?tab=CREDIT`); }}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition flex items-center gap-1.5 ${
            activeTab === 'CREDIT' 
              ? 'bg-[#7e2562] text-white shadow-sm' 
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <FileText className="w-4 h-4" /> Credit Copies
        </button>
        <button 
          onClick={() => { setActiveTab('DAY_CLOSE'); router.push(`/dashboard/exhibitions/${exhibitionId}?tab=DAY_CLOSE`); }}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition flex items-center gap-1.5 ${
            activeTab === 'DAY_CLOSE' 
              ? 'bg-[#7e2562] text-white shadow-sm' 
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Clock className="w-4 h-4" /> End of Day Close
        </button>
      </div>

      {/* TAB CONTENT */}
      {activeTab === 'POS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stock Selection Column */}
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-4 space-y-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-[#7e2562]" /> Select Books to Sell
            </h3>

            {posSuccessMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-lg text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {posSuccessMsg}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
              {exhibition.stock?.map((item: any) => {
                const avail = (item.quantityTaken || 0) + (item.quantityTopUp || 0) - (item.quantitySold || 0) - (item.quantityReturned || 0);
                return (
                  <div 
                    key={item.id} 
                    className="border border-gray-200 rounded-lg p-3 flex flex-col justify-between hover:border-[#7e2562] transition bg-gray-50/50"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-gray-900 line-clamp-1">{item.book?.title}</h4>
                      <p className="text-[10px] text-gray-500 font-mono mt-0.5">ISBN: {item.book?.isbn || 'N/A'}</p>
                      <span className="text-xs font-black text-emerald-700 mt-1 block">₹{item.book?.price}</span>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-gray-200 pt-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${avail > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                        {avail} in stock
                      </span>
                      <button 
                        disabled={avail <= 0}
                        onClick={() => handleAddToCart(item)}
                        className="px-2.5 py-1 text-xs font-bold text-white bg-[#7e2562] hover:bg-[#681b50] rounded disabled:opacity-40 transition"
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cart Column */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5 border-b pb-2">
                <ShoppingCart className="w-4 h-4 text-[#7e2562]" /> Current Order Cart
              </h3>

              {cart.length === 0 ? (
                <div className="py-12 text-center text-xs text-gray-400">Cart is empty. Click + Add on books.</div>
              ) : (
                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                  {cart.map((c, idx) => (
                    <div key={c.bookId} className="flex items-center justify-between text-xs border-b pb-2">
                      <div className="flex-1 pr-2">
                        <span className="font-bold text-gray-800 block line-clamp-1">{c.title}</span>
                        <span className="text-[10px] text-gray-500">₹{c.price} x {c.quantity}</span>
                      </div>
                      <span className="font-black text-gray-900">₹{c.price * c.quantity}</span>
                    </div>
                  ))}
                </div>
              )}

              {cart.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-gray-200">
                  <div>
                    <label className="text-[10px] font-bold text-gray-600 block">Customer Name</label>
                    <input 
                      type="text" 
                      value={posCustomerName}
                      onChange={e => setPosCustomerName(e.target.value)}
                      placeholder="Walk-in Customer"
                      className="w-full text-xs p-2 border rounded mt-0.5"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-600 block">Payment Method</label>
                    <select 
                      value={posPaymentMethod}
                      onChange={e => setPosPaymentMethod(e.target.value as any)}
                      className="w-full text-xs p-2 border rounded mt-0.5"
                    >
                      <option value="CASH">CASH</option>
                      <option value="UPI">UPI / GPay</option>
                    </select>
                  </div>

                  <div className="flex justify-between items-center text-sm font-black pt-2 border-t">
                    <span>Total Amount:</span>
                    <span className="text-emerald-700 text-base">₹{totalCartAmount}</span>
                  </div>
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <button 
                disabled={submittingPos}
                onClick={handleCheckoutPOS}
                className="w-full py-3 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submittingPos ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Complete Sale & Generate Bill
              </button>
            )}
          </div>
        </div>
      )}

      {/* STOCK LEVEL TAB */}
      {activeTab === 'STOCK' && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 font-bold text-slate-500 uppercase border-b">
              <tr>
                <th className="p-3">Book Title</th>
                <th className="p-3">ISBN</th>
                <th className="p-3">Taken</th>
                <th className="p-3">Top-Up</th>
                <th className="p-3 text-emerald-700">Sold</th>
                <th className="p-3 text-indigo-700">Available</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {exhibition.stock?.map((s: any) => {
                const avail = (s.quantityTaken || 0) + (s.quantityTopUp || 0) - (s.quantitySold || 0) - (s.quantityReturned || 0);
                return (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-gray-900">{s.book?.title}</td>
                    <td className="p-3 font-mono text-gray-500">{s.book?.isbn || '-'}</td>
                    <td className="p-3 font-semibold">{s.quantityTaken}</td>
                    <td className="p-3 font-semibold">{s.quantityTopUp || 0}</td>
                    <td className="p-3 font-bold text-emerald-700">{s.quantitySold || 0}</td>
                    <td className="p-3 font-bold text-indigo-700">{avail}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* END OF DAY CLOSE TAB */}
      {activeTab === 'DAY_CLOSE' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 max-w-xl mx-auto space-y-4">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2 border-b pb-3">
            <Clock className="w-5 h-5 text-[#7e2562]" /> Daily Cash Reconciliation (End of Day Close)
          </h3>

          {dayCloseSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-lg text-xs font-bold">
              {dayCloseSuccess}
            </div>
          )}

          <form onSubmit={handleDayCloseSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-700 block">Today's Billed Cash Total (System)</label>
              <input 
                type="text" 
                readOnly 
                value={`₹${metrics?.cashTotal || 0}`}
                className="w-full text-xs p-2.5 bg-gray-100 border rounded font-mono mt-1 font-bold"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block">Actual Counted Physical Cash in Drawer (₹)</label>
              <input 
                type="number" 
                required
                value={countedCash}
                onChange={e => setCountedCash(e.target.value)}
                placeholder="Enter physical cash amount counted"
                className="w-full text-xs p-2.5 border rounded mt-1 font-bold"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block">Notes / Observations</label>
              <textarea 
                value={dayCloseNote}
                onChange={e => setDayCloseNote(e.target.value)}
                placeholder="Optional notes regarding cash drawer count..."
                className="w-full text-xs p-2.5 border rounded mt-1 h-20"
              />
            </div>

            <button 
              type="submit"
              disabled={submittingClose}
              className="w-full py-3 text-xs font-bold text-white bg-[#7e2562] hover:bg-[#681b50] rounded-lg shadow transition flex items-center justify-center gap-2"
            >
              {submittingClose ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Submit Daily Cash Close
            </button>
          </form>
        </div>
      )}

      {/* VENUE INVOICES TAB */}
      {activeTab === 'BILLS' && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 border-b pb-3">
            <Receipt className="w-5 h-5 text-[#7e2562]" /> Sales & Invoices Generated at Venue ({data.bills?.length || 0})
          </h3>
          {(!data.bills || data.bills.length === 0) ? (
            <div className="py-12 text-center text-xs text-gray-400">No invoices billed at this venue yet. Use Live POS Billing to create sales.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 font-bold text-slate-500 uppercase border-b">
                  <tr>
                    <th className="p-3">Bill Number</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Payment</th>
                    <th className="p-3">Items</th>
                    <th className="p-3 font-black text-[#7e2562]">Total Amount</th>
                    <th className="p-3">Date & Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.bills.map((b: any) => (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-[#7e2562]">{b.billNumber}</td>
                      <td className="p-3 font-semibold">{b.customerName || 'Walk-in'}</td>
                      <td className="p-3 font-bold uppercase text-slate-600">{b.paymentMethod}</td>
                      <td className="p-3">{b.items?.length || 0} items</td>
                      <td className="p-3 font-black text-emerald-700">₹{b.netAmount}</td>
                      <td className="p-3 text-gray-400 font-mono text-[11px]">{new Date(b.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MID-EVENT TOPUP TAB */}
      {activeTab === 'TOPUP' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 max-w-2xl mx-auto space-y-4">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2 border-b pb-3">
            <Send className="w-5 h-5 text-[#7e2562]" /> Request Mid-Event Stock Top-Up
          </h3>
          <p className="text-xs text-gray-500">
            Submit a request to source extra books from the central warehouse or branch while the exhibition is ongoing.
          </p>
          <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-lg text-xs font-semibold">
            ⚡ Once approved & dispatched by inventory manager, requested stock will immediately add to your venue inventory.
          </div>
        </div>
      )}

      {/* CREDIT COPIES TAB */}
      {activeTab === 'CREDIT' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 max-w-2xl mx-auto space-y-4">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2 border-b pb-3">
            <FileText className="w-5 h-5 text-[#7e2562]" /> Issue Free / VIP Credit Copies
          </h3>
          <p className="text-xs text-gray-500">
            Issue complimentary review or VIP copies at the venue. Credit copies generate a ₹0 invoice tagged for credit copy accounting.
          </p>
        </div>
      )}
    </div>
  );
}
