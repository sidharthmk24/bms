"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useExhibitionWorkspace } from '../ExhibitionContext';
import { api } from '@/lib/api';
import { generateBillPDF } from '@/lib/pdfUtils';
import { 
  ShoppingCart, Search, Plus, Minus, Trash2, Receipt, 
  Loader2, Printer, CheckCircle2, User, Phone, Sparkles,
  Barcode, RefreshCw, MapPin, QrCode, X
} from 'lucide-react';

interface CartItem {
  bookId: string;
  title: string;
  author: string;
  barcode?: string;
  price: number;
  quantity: number;
  availableQty: number;
}

export default function LivePOSBillingPage() {
  const { exhibition, data, exhibitionId, metrics, fetchWorkspaceData } = useExhibitionWorkspace();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI'>('CASH');
  const [discount, setDiscount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUpiQrModal, setShowUpiQrModal] = useState(false);

  // Success state
  const [completedBill, setCompletedBill] = useState<any>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  const isDispatched = ['DISPATCHED', 'ONGOING', 'CLOSED', 'OVERDUE'].includes(exhibition?.status || '');

  const rawStock = isDispatched 
    ? ((exhibition?.stock && exhibition.stock.length > 0)
        ? exhibition.stock
        : (data?.eventToDate?.sellThroughList || []))
    : [];

  // Filter stock by search query
  const availableStock = rawStock.map((s: any) => {
    const avail = s.quantityRemaining !== undefined
      ? s.quantityRemaining
      : (s.quantityTaken || 0) + (s.quantityTopUp || 0) - (s.quantitySold || 0) - (s.quantityReturned || 0);

    return {
      stockId: s.id || s.bookId,
      bookId: s.bookId || s.book?.id,
      title: s.book?.title || 'Unknown Title',
      author: s.book?.author?.name || s.book?.authorName || 'Unknown Author',
      barcode: s.book?.barcode || s.book?.isbn || '',
      price: Number(s.book?.price || 0),
      availableQty: Math.max(0, avail),
      raw: s
    };
  });

  const filteredBooks = availableStock.filter((item: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      item.title.toLowerCase().includes(q) ||
      item.author.toLowerCase().includes(q) ||
      item.barcode.toLowerCase().includes(q)
    );
  });

  const handleAddToCart = (item: any) => {
    if (item.availableQty <= 0) return;

    setCart(prev => {
      const existing = prev.find(i => i.bookId === item.bookId);
      if (existing) {
        if (existing.quantity >= item.availableQty) return prev;
        return prev.map(i => i.bookId === item.bookId ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, {
        bookId: item.bookId,
        title: item.title,
        author: item.author,
        barcode: item.barcode,
        price: item.price,
        quantity: 1,
        availableQty: item.availableQty
      }];
    });
  };

  const updateQuantity = (bookId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.bookId === bookId) {
        const newQ = Math.min(item.availableQty, Math.max(1, item.quantity + delta));
        return { ...item, quantity: newQ };
      }
      return item;
    }));
  };

  const removeItem = (bookId: string) => {
    setCart(prev => prev.filter(i => i.bookId !== bookId));
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    const code = barcodeInput.trim().toLowerCase();
    setBarcodeInput('');

    const matched = availableStock.find((b: any) => b.barcode.toLowerCase() === code || b.title.toLowerCase().includes(code));
    if (matched) {
      handleAddToCart(matched);
    } else {
      alert(`No venue stock item found for "${code}"`);
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const netTotal = Math.max(0, subtotal - (Number(discount) || 0));

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    setIsSubmitting(true);
    try {
      const payload = {
        exhibitionId,
        customerName: customerName.trim() || 'Walk-in Customer',
        customerPhone: customerPhone.trim() || undefined,
        paymentStatus: 'PAID',
        paymentMode: paymentMode,
        discount: Number(discount) || 0,
        items: cart.map(item => ({
          bookId: item.bookId,
          quantity: item.quantity,
          unitPrice: item.price
        }))
      };

      const res = await api.post('/billing/checkout', payload);
      if (res.success && res.data) {
        setCompletedBill({
          ...res.data,
          items: cart,
          netAmount: netTotal,
          exhibitionName: exhibition?.name
        });
        setCart([]);
        setCustomerName('');
        setCustomerPhone('');
        setDiscount(0);
        await fetchWorkspaceData();
        window.dispatchEvent(new Event('app:data-mutated'));
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Checkout failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    if (!completedBill) return;
    generateBillPDF(completedBill, completedBill.items || [], { name: exhibition?.name || 'Exhibition Venue' });
  };

  return (
    <div className="space-y-4">
      {/* Front Desk Header */}
      <div className="bg-slate-900 text-white p-4 rounded-xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#7e2562] rounded-lg">
            <ShoppingCart className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              
              <span className="text-xs text-slate-400 font-mono">Venue: {exhibition?.name}</span>
            </div>
            <h1 className="text-xl font-black text-white mt-0.5">Exhibition Live POS Billing</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Today's Venue Revenue</span>
            <span className="text-lg font-black text-emerald-400">
              ₹{Number(metrics?.totalRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <button
            onClick={fetchWorkspaceData}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition"
            title="Refresh Stock"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bill Generation Success Alert Modal */}
      {completedBill && (
        <div className="bg-emerald-900/90 text-white p-6 rounded-xl border border-emerald-500 shadow-2xl space-y-4 animate-in fade-in duration-200">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
              <div>
                <h3 className="text-lg font-black text-white">Bill Generated Successfully!</h3>
                <p className="text-xs text-emerald-200 mt-0.5">
                  Invoice <strong className="font-mono text-white">#{completedBill.billNumber || completedBill.id}</strong> — Total ₹{completedBill.netAmount} ({completedBill.paymentMethod})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="px-4 py-2 text-xs font-bold bg-white text-emerald-950 hover:bg-emerald-100 rounded-lg shadow transition flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Print Receipt (PDF)
              </button>
              <button
                onClick={() => setCompletedBill(null)}
                className="px-4 py-2 text-xs font-bold bg-emerald-800 hover:bg-emerald-700 text-white rounded-lg transition cursor-pointer"
              >
                Start Next Sale
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Dual-Column POS Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Stock Selection & Search */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          {/* Quick Barcode Scanner & Search Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
            <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  ref={barcodeInputRef}
                  type="text"
                  value={barcodeInput}
                  onChange={e => setBarcodeInput(e.target.value)}
                  placeholder="Scan barcode or type exact barcode / ISBN..."
                  className="w-full text-xs pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#7e2562] font-mono bg-slate-50"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2.5 text-xs font-bold text-white bg-[#7e2562] hover:bg-[#681b50] rounded-lg transition cursor-pointer"
              >
                Scan / Add
              </button>
            </form>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search venue books by title, author, or ISBN..."
                className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#7e2562]"
              />
            </div>
          </div>

          {/* Book Catalog Grid */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3 border-b pb-2">
              <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider">
                Venue Stock Catalog ({filteredBooks.length} items)
              </h3>
            </div>

            {filteredBooks.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No venue books matching your search query.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[550px] overflow-y-auto pr-1">
                {filteredBooks.map((item: any) => (
                  <div
                    key={item.bookId}
                    className="border border-slate-200 rounded-xl p-3 flex flex-col justify-between hover:border-[#7e2562] hover:shadow-md transition bg-slate-50/50"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{item.title}</h4>
                      <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{item.author}</p>
                      <span className="text-sm font-black text-emerald-700 mt-1 block">₹{item.price}</span>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between">
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                        item.availableQty > 5 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : item.availableQty > 0 
                            ? 'bg-amber-100 text-amber-800' 
                            : 'bg-red-100 text-red-800'
                      }`}>
                        {item.availableQty} available
                      </span>

                      <button
                        disabled={item.availableQty <= 0}
                        onClick={() => handleAddToCart(item)}
                        className="px-3 py-1 text-xs font-bold text-white bg-[#7e2562] hover:bg-[#681b50] rounded-lg disabled:opacity-40 transition cursor-pointer"
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Front Desk Order Cart Terminal */}
        <div className="lg:col-span-5 xl:col-span-4 bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#7e2562]" /> Current Billing Cart
              </h3>
              {cart.length > 0 && (
                <button
                  onClick={() => setCart([])}
                  className="text-[10px] text-red-600 font-bold hover:underline"
                >
                  Clear Cart
                </button>
              )}
            </div>

            {/* Cart Items List */}
            {cart.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-400 space-y-2">
                <ShoppingCart className="w-8 h-8 text-slate-300 mx-auto" />
                <p>Cart is empty. Click "+ Add" on catalog books or scan barcode.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                {cart.map((c) => (
                  <div key={c.bookId} className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <div className="flex-1 pr-2">
                      <span className="font-bold text-slate-800 block line-clamp-1">{c.title}</span>
                      <span className="text-[10px] text-slate-500 font-mono">₹{c.price} x {c.quantity}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-slate-300 rounded bg-white">
                        <button
                          onClick={() => updateQuantity(c.bookId, -1)}
                          className="p-1 hover:bg-slate-100 text-slate-600 cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 text-xs font-bold font-mono">{c.quantity}</span>
                        <button
                          onClick={() => updateQuantity(c.bookId, 1)}
                          className="p-1 hover:bg-slate-100 text-slate-600 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <span className="font-black text-slate-900 min-w-[50px] text-right font-mono">
                        ₹{c.price * c.quantity}
                      </span>

                      <button
                        onClick={() => removeItem(c.bookId)}
                        className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Customer Details & Checkout Form */}
            {cart.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-400" /> Customer Name
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder="Walk-in Customer"
                    className="w-full text-xs p-2.5 border rounded-lg mt-0.5 font-semibold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" /> Customer Phone (Optional)
                  </label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    placeholder="10-digit mobile number"
                    className="w-full text-xs p-2.5 border rounded-lg mt-0.5 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMode('CASH');
                        setShowUpiQrModal(false);
                      }}
                      className={`py-2 text-xs font-bold rounded-lg border transition cursor-pointer ${
                        paymentMode === 'CASH'
                          ? 'bg-[#7e2562] text-white border-[#7e2562]'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      💵 CASH
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMode('UPI');
                        setShowUpiQrModal(true);
                      }}
                      className={`py-2 text-xs font-bold rounded-lg border transition cursor-pointer flex items-center justify-center gap-1 ${
                        paymentMode === 'UPI'
                          ? 'bg-[#7e2562] text-white border-[#7e2562]'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <QrCode className="w-3.5 h-3.5" /> 📱 UPI / GPay
                    </button>
                  </div>
                </div>

                {/* Subtotal & Discount Calculation */}
                <div className="space-y-1.5 pt-2 border-t text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Cart Subtotal:</span>
                    <span className="font-mono font-bold">₹{subtotal}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Discount (₹):</span>
                    <input
                      type="number"
                      min="0"
                      value={discount}
                      onChange={e => setDiscount(Number(e.target.value))}
                      className="w-20 text-right p-1 text-xs border rounded font-mono font-bold"
                    />
                  </div>
                  <div className="flex justify-between items-center text-sm font-black pt-2 border-t">
                    <span className="text-slate-900">Total Net Amount:</span>
                    <span className="text-emerald-700 text-lg font-mono">₹{netTotal}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {cart.length > 0 && (
            <button
              disabled={isSubmitting}
              onClick={(e) => {
                if (paymentMode === 'UPI' && !showUpiQrModal) {
                  setShowUpiQrModal(true);
                } else {
                  handleCheckout(e);
                }
              }}
              className="w-full py-3.5 text-xs font-black uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
              {paymentMode === 'UPI' ? 'Show UPI QR & Complete Sale' : 'Complete Sale & Generate Receipt'}
            </button>
          )}
        </div>
      </div>

      {/* UPI / GPay QR Payment Modal Popup */}
      {showUpiQrModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4 relative">
            <button
              onClick={() => setShowUpiQrModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1 rounded-full cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="inline-flex p-3 bg-purple-100 rounded-full text-purple-700 mx-auto">
              <QrCode className="w-8 h-8" />
            </div>

            <div>
              <span className="text-[10px] font-black uppercase text-purple-700 tracking-wider bg-purple-50 px-2.5 py-0.5 rounded border border-purple-200">
                UPI / GPay Payment Scanner
              </span>
              <h3 className="text-lg font-black text-slate-900 mt-1">Scan QR Code to Pay</h3>
              <p className="text-xs text-slate-500 mt-0.5">Venue: {exhibition?.name || 'Exhibition Venue'}</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col items-center justify-center space-y-3">
              <span className="text-xs text-slate-500 font-bold uppercase">Total Payable Amount</span>
              <span className="text-3xl font-black text-emerald-600 font-mono">₹{netTotal}</span>

              {/* QR Code Image (Uploaded photo or dynamic scan-to-pay QR) */}
              <div className="p-3 bg-white rounded-xl shadow-md border border-slate-200 inline-block">
                <img
                  src={exhibition?.upiQrCode || exhibition?.qrCodeUrl || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`upi://pay?pa=${exhibition?.upiId || 'kairalibooks@upi'}&pn=${encodeURIComponent(exhibition?.name || 'Kairali Books')}&am=${netTotal}&cu=INR`)}`}
                  alt="UPI QR Code"
                  className="w-48 h-48 object-contain mx-auto"
                />
              </div>

              <div className="text-[11px] text-slate-600 font-mono font-semibold">
                UPI VPA: <strong className="text-purple-700">{exhibition?.upiId || 'kairalibooks@upi'}</strong>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 italic">
              Ask customer to scan using GPay, PhonePe, Paytm or any UPI app.
            </p>

            <div className="space-y-2 pt-2">
              <button
                disabled={isSubmitting}
                onClick={async (e) => {
                  setShowUpiQrModal(false);
                  await handleCheckout(e);
                }}
                className="w-full py-3.5 text-xs font-black uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                ✓ Payment Received — Complete Sale
              </button>

              <button
                type="button"
                onClick={() => setShowUpiQrModal(false)}
                className="w-full py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition cursor-pointer"
              >
                Cancel / Change Method
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
