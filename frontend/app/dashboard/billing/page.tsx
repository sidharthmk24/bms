"use client";

import { useState, useRef, useEffect } from 'react';
import { api } from '@/lib/api';
import { Search, Plus, Minus, Trash2, Receipt, AlertCircle, Loader2, Printer, CheckCircle2, MessageCircle } from 'lucide-react';
import { generateBillPDF } from '@/lib/pdfUtils';
import { useApiData } from '@/hooks/useApiData';
import { motion, AnimatePresence } from 'framer-motion';

interface CartItem {
  bookId: string;
  title: string;
  author: string;
  barcode: string;
  price: number;
  quantity: number;
}

export default function BillingPage() {
  const { data: branches } = useApiData<any>('/branches');
  const { data: exhibitions } = useApiData<any[]>('/exhibitions', []);
  const ongoingExhibitions = (exhibitions || []).filter((ex: any) => ex.status === 'ONGOING');
  const [selectedExhibitionId, setSelectedExhibitionId] = useState<string>('');

  const [cart, setCart] = useState<CartItem[]>([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [discount, setDiscount] = useState<number>(0);
  const [paymentStatus, setPaymentStatus] = useState<'PAID' | 'UNPAID'>('PAID');
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI'>('CASH');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Success state
  const [completedBill, setCompletedBill] = useState<any>(null);
  const [completedCart, setCompletedCart] = useState<CartItem[]>([]);
  const [phoneError, setPhoneError] = useState('');
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [smsSent, setSmsSent] = useState(false);
  const [smsError, setSmsError] = useState('');

  // Enquiry Modal State
  const [showEnquiryModal, setShowEnquiryModal] = useState(false);
  const [missingBarcode, setMissingBarcode] = useState('');
  const [enquiryTitle, setEnquiryTitle] = useState('');

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Keep scanner input focused when clicking around (tablet POS behavior)
  useEffect(() => {
    const focusScanner = (e: MouseEvent) => {
      if (
        e.target instanceof HTMLInputElement || 
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement ||
        e.target instanceof HTMLButtonElement
      ) {
        return;
      }
      if (!completedBill) barcodeInputRef.current?.focus();
    };
    
    document.addEventListener('click', focusScanner);
    return () => document.removeEventListener('click', focusScanner);
  }, [completedBill]);

  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const currentBarcode = barcodeInput.trim();
    setBarcodeInput('');
    setIsScanning(true);

    try {
      const res = await api.get(`/catalog/books-barcode/${currentBarcode}`);
      if (res.success && res.data) {
        const book = res.data;
        
        setCart(prev => {
          const existing = prev.find(item => item.bookId === book.id);
          if (existing) {
            return prev.map(item => 
              item.bookId === book.id 
                ? { ...item, quantity: item.quantity + 1 }
                : item
            );
          }
          return [...prev, {
            bookId: book.id,
            title: book.title,
            author: book.author?.name || 'Unknown',
            barcode: book.barcode,
            price: Number(book.price),
            quantity: 1
          }];
        });
      }
    } catch (err: any) {
      if (err.response?.status === 404) {
        setMissingBarcode(currentBarcode);
        setShowEnquiryModal(true);
      } else {
        alert(err.response?.data?.message || 'Error fetching book');
      }
    } finally {
      setIsScanning(false);
    }
  };

  const updateQuantity = (bookId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.bookId === bookId) {
        const newQ = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQ };
      }
      return item;
    }));
  };

  const removeItem = (bookId: string) => {
    setCart(prev => prev.filter(item => item.bookId !== bookId));
  };

  const validatePhone = (phone: string) => {
    if (!phone) return true; // Optional
    const phoneRegex = /^[0-9]{10}$/;
    return phoneRegex.test(phone);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    
    if (!customerName.trim()) {
      alert("Customer Name is mandatory for checkout.");
      return;
    }

    if (customerPhone && !validatePhone(customerPhone)) {
      setPhoneError("Please enter a valid 10-digit phone number.");
      return;
    }
    setPhoneError("");

    setIsSubmitting(true);
    try {
      const payload = {
        items: cart.map(item => ({ bookId: item.bookId, quantity: item.quantity })),
        discount: discount || 0,
        paymentStatus,
        paymentMode: paymentStatus === 'PAID' ? paymentMode : undefined,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        exhibitionId: selectedExhibitionId || undefined,
      };

      const res = await api.post('/billing/checkout', payload);
      if (res.success) {
        // Save the successful state for printing
        setCompletedBill(res.data);
        setCompletedCart([...cart]);
        // Do not clear the form immediately, let the success UI take over
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Checkout failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const printBill = () => {
    if (!completedBill) return;
    const currentBranch = branches?.find((b: any) => b.id === completedBill.branchId);
    const branchName = currentBranch?.name || completedBill.branchId;
    generateBillPDF(completedBill, completedCart, branchName);
  };

  const startNewSale = () => {
    setCart([]);
    setDiscount(0);
    setCustomerName('');
    setCustomerPhone('');
    setPhoneError('');
    setSelectedExhibitionId('');
    setCompletedBill(null);
    setCompletedCart([]);
    setSmsSent(false);
    setSmsError('');
    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 100);
  };

  const handleLogEnquiry = async () => {
    try {
      await api.post('/enquiries', {
        freeTextTitle: enquiryTitle || missingBarcode,
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined
      });
      alert('Enquiry logged successfully');
      setShowEnquiryModal(false);
      setEnquiryTitle('');
      barcodeInputRef.current?.focus();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to log enquiry');
    }
  };

  const subTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const grandTotal = Math.max(0, subTotal - (discount || 0));

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-8rem)] gap-6">
      
      {/* Left Pane: Cart */}
      <div className="flex-1 flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden relative">
        <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 flex items-center">
            <ShoppingCartIcon className="w-5 h-5 mr-2 text-blue-600" />
            Current Bill
          </h3>
          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
            {cart.length} items
          </span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <AnimatePresence>
            {cart.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="h-full flex flex-col items-center justify-center text-gray-400"
              >
                <Receipt className="w-12 h-12 mb-3 text-gray-300" />
                <p>Scan a book to start billing</p>
              </motion.div>
            ) : (
              cart.map(item => (
                <motion.div 
                  key={item.bookId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center justify-between p-3 border rounded-lg hover:border-blue-300 transition-colors bg-white"
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="text-sm font-semibold text-gray-900 truncate">{item.title}</p>
                    <p className="text-xs text-gray-500 truncate">{item.barcode} • {item.author}</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center border rounded-lg overflow-hidden">
                      <button disabled={!!completedBill} onClick={() => updateQuantity(item.bookId, -1)} className="p-1.5 hover:bg-gray-100 text-gray-600 disabled:opacity-50">
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <button disabled={!!completedBill} onClick={() => updateQuantity(item.bookId, 1)} className="p-1.5 hover:bg-gray-100 text-gray-600 disabled:opacity-50">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="w-20 text-right">
                      <p className="text-sm font-semibold">₹{(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                    <button disabled={!!completedBill} onClick={() => removeItem(item.bookId)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-50">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Totals Section */}
        <div className="bg-gray-50 p-4 border-t">
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span>₹{subTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm items-center">
              <span className="text-gray-600">Discount</span>
              <div className="relative">
                <span className="absolute left-2.5 top-1 text-gray-500">₹</span>
                <input 
                  type="number" 
                  min="0"
                  step="0.01"
                  disabled={!!completedBill}
                  value={discount}
                  onChange={e => setDiscount(Number(e.target.value) || 0)}
                  className="w-24 pl-6 pr-2 py-1 text-right text-sm border rounded bg-white focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                />
              </div>
            </div>
            <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t border-gray-200">
              <span>Total</span>
              <span>₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Success Overlay for Cart */}
        {completedBill && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex items-center justify-center">
            <div className="text-center p-6 bg-white border border-green-200 rounded-xl shadow-lg">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Sale Completed!</h2>
              <p className="text-gray-600 mb-6">Bill No: {completedBill.billNumber}</p>
            </div>
          </div>
        )}
      </div>

      {/* Right Pane: Scanner & Checkout Form */}
      <div className="lg:w-96 flex flex-col space-y-6">
        
        {completedBill ? (
          /* SUCCESS STATE PANEL */
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex-1 flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-right-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <Receipt className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Ready to Print</h3>
            <p className="text-sm text-gray-500 mb-8">
              The transaction has been successfully recorded. You can now print the invoice or start a new sale.
            </p>

          <div className="space-y-4 w-full">
              <button
                onClick={printBill}
                className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <Printer className="w-5 h-5 mr-2" />
                Print Bill (PDF)
              </button>

              {/* SMS Button */}
              {/* {completedBill?.customerPhone ? (
                <button
                  onClick={async () => {
                    setIsSendingSms(true);
                    setSmsError('');
                    try {
                      await api.post(`/billing/${completedBill.id}/send-sms`, { phone: completedBill.customerPhone });
                      setSmsSent(true);
                    } catch (e: any) {
                      setSmsError(e?.response?.data?.message || 'Failed to send SMS. Check FAST2SMS_API_KEY.');
                    } finally {
                      setIsSendingSms(false);
                    }
                  }}
                  disabled={isSendingSms || smsSent}
                  className={`w-full flex justify-center items-center py-3.5 px-4 border rounded-lg shadow-sm text-base font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    smsSent
                      ? 'border-green-300 bg-green-50 text-green-700 cursor-default'
                      : 'border-emerald-500 bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500'
                  } disabled:opacity-60`}
                >
                  {isSendingSms ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <MessageCircle className="w-5 h-5 mr-2" />
                  )}
                  {smsSent ? `SMS Sent to ${completedBill.customerPhone}` : `Send Bill via SMS`}
                </button>
              ) : (
                <div className="w-full py-2.5 px-4 border border-dashed border-gray-300 rounded-lg text-center text-sm text-gray-400">
                  No phone number — SMS unavailable
                </div>
              )} */}

              {smsError && (
                <p className="text-xs text-red-600 text-center flex items-center justify-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />{smsError}
                </p>
              )}
              
              <button
                onClick={startNewSale}
                className="w-full flex justify-center items-center py-3.5 px-4 border border-gray-300 rounded-lg shadow-sm text-base font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <Plus className="w-5 h-5 mr-2" />
                Start New Sale
              </button>
            </div>
          </div>
        ) : (
          /* NORMAL CHECKOUT PANEL */
          <>
            {/* Scanner Input */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">Scan Barcode / ISBN</label>
              <form onSubmit={handleBarcodeSubmit} className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  {isScanning ? (
                    <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                  ) : (
                    <Search className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <input
                  ref={barcodeInputRef}
                  type="text"
                  autoFocus
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="Waiting for scanner..."
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent transition-colors"
                />
              </form>
              <div className="flex justify-between items-center mt-3">
                <p className="text-xs text-gray-400 flex items-center">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Scanner auto-focus is active
                </p>
                <button
                  type="button"
                  onClick={handleBarcodeSubmit}
                  disabled={isScanning || !barcodeInput.trim()}
                  className="text-xs px-4 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-md font-medium transition-colors flex items-center disabled:opacity-50"
                >
                  Enter
                </button>
              </div>
            </div>

            {/* Checkout Details */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex-1 flex flex-col">
              <h3 className="font-semibold text-gray-800 mb-4 border-b pb-2">Checkout Details</h3>
              
              <div className="space-y-4 flex-1">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder="Enter customer name"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Phone (Optional)</label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={e => {
                      setCustomerPhone(e.target.value);
                      if (phoneError) setPhoneError('');
                    }}
                    placeholder="10-digit number"
                    className={`block w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                      phoneError ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  {phoneError && <p className="text-xs text-red-500 mt-1">{phoneError}</p>}
                </div>

                {ongoingExhibitions.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Link to Exhibition (Optional)
                    </label>
                    <select
                      value={selectedExhibitionId}
                      onChange={e => setSelectedExhibitionId(e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white"
                    >
                      <option value="">-- Normal Branch counter --</option>
                      {ongoingExhibitions.map((ex: any) => (
                        <option key={ex.id} value={ex.id}>
                          {ex.name || ex.eventName} ({ex.location})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="pt-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Mode</label>
                  <div className="flex rounded-md shadow-sm">
                    <button
                      type="button"
                      onClick={() => setPaymentMode('CASH')}
                      className={`flex-1 px-4 py-2 text-sm font-medium rounded-l-lg border ${
                        paymentMode === 'CASH' 
                          ? 'bg-green-50 border-green-500 text-green-700 z-10' 
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Cash
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMode('UPI')}
                      className={`flex-1 px-4 py-2 text-sm font-medium rounded-r-lg border-y border-r border-l-0 ${
                        paymentMode === 'UPI' 
                          ? 'bg-purple-50 border-purple-500 text-purple-700 z-10' 
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      UPI
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t">
                <button
                  onClick={handleCheckout}
                  disabled={cart.length === 0 || isSubmitting || !customerName.trim()}
                  className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Receipt className="w-5 h-5 mr-2" />}
                  Complete Sale • ${grandTotal.toFixed(2)}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Missing Barcode Enquiry Modal */}
      <AnimatePresence>
        {showEnquiryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-md p-6"
            >
              <div className="flex items-center text-amber-600 mb-4">
                <AlertCircle className="w-6 h-6 mr-2" />
                <h3 className="text-lg font-bold">Book Not Found</h3>
              </div>
              
              <p className="text-gray-600 mb-4 text-sm">
                Barcode <strong className="text-gray-900">{missingBarcode}</strong> was not found in the catalog. Would you like to log an enquiry for it?
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Book Title / Description</label>
                  <input
                    type="text"
                    value={enquiryTitle}
                    onChange={e => setEnquiryTitle(e.target.value)}
                    placeholder="E.g., Harry Potter - Part 1"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => {
                      setShowEnquiryModal(false);
                      barcodeInputRef.current?.focus();
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  {/* <button
                    onClick={handleLogEnquiry}
                    disabled={!enquiryTitle && !missingBarcode}
                    className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50"
                  >
                    Log Enquiry
                  </button> */}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

// Quick inline icon component to avoid missing imports
function ShoppingCartIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </svg>
  );
}
