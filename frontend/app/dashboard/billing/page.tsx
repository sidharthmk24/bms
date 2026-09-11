"use client";

import { useState, useRef, useEffect } from 'react';
import { api } from '@/lib/api';
import { Search, Plus, Minus, Trash2, Receipt, AlertCircle, Loader2, Printer, CheckCircle2, MessageCircle, User, Phone, ShoppingCart as ShoppingCartIcon } from 'lucide-react';
import { generateBillPDF } from '@/lib/pdfUtils';
import { useApiData } from '@/hooks/useApiData';
import { useConfirm } from '@/contexts/ConfirmContext';
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
  const confirm = useConfirm();
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

  // Customer Autocomplete State
  const [customerSuggestions, setCustomerSuggestions] = useState<{
    customerName: string;
    customerPhone: string | null;
    lastVisit: string;
  }[]>([]);
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);
  const [activeSearchField, setActiveSearchField] = useState<'name' | 'phone' | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const customerDropdownRef = useRef<HTMLDivElement>(null);

  const triggerCustomerSearch = (query: string, field: 'name' | 'phone') => {
    setActiveSearchField(field);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!query || query.trim().length < 2) {
      setCustomerSuggestions([]);
      setIsSearchingCustomers(false);
      return;
    }

    setIsSearchingCustomers(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await api.get(`/billing/customers?q=${encodeURIComponent(query.trim())}`);
        if (res.success && Array.isArray(res.data)) {
          setCustomerSuggestions(res.data);
        } else {
          setCustomerSuggestions([]);
        }
      } catch (err) {
        console.error('Failed to search customers:', err);
        setCustomerSuggestions([]);
      } finally {
        setIsSearchingCustomers(false);
      }
    }, 250);
  };

  const selectCustomer = (cust: { customerName: string; customerPhone: string | null }) => {
    setCustomerName(cust.customerName);
    setCustomerPhone(cust.customerPhone || '');
    if (phoneError) setPhoneError('');
    setCustomerSuggestions([]);
    setActiveSearchField(null);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target as Node)) {
        setActiveSearchField(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const removeItem = async (bookId: string) => {
    const item = cart.find(i => i.bookId === bookId);
    const ok = await confirm({
      title: "Remove Book from Cart",
      message: `Are you sure you want to remove "${item?.title || 'this item'}" from the current bill?`,
      confirmText: "Yes, Remove",
      cancelText: "No, Keep",
      variant: "danger",
    });
    if (!ok) return;
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

    const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
    const ok = await confirm({
      title: "Confirm Checkout & Bill Generation",
      message: `Complete sale of ${totalItems} book(s) for ₹${grandTotal.toFixed(2)} to customer "${customerName.trim()}" (${paymentStatus} via ${paymentMode})?`,
      confirmText: "Yes, Complete Sale",
      cancelText: "No, Continue Editing",
      variant: "success",
    });
    if (!ok) return;

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
    generateBillPDF(completedBill, completedCart, currentBranch || completedBill.branchId);
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
    setCustomerSuggestions([]);
    setActiveSearchField(null);
    setSmsSent(false);
    setSmsError('');
    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 100);
  };

  const handleLogEnquiry = async () => {
    const ok = await confirm({
      title: "Confirm Book Enquiry Log",
      message: `Log missing book enquiry for "${enquiryTitle || missingBarcode}"?`,
      confirmText: "Yes, Log Enquiry",
      cancelText: "No, Cancel",
      variant: "primary",
    });
    if (!ok) return;

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
      <div className="flex-1 flex flex-col bg-white rounded-sm border border-[#7e2562]/15 shadow-sm overflow-hidden relative">
        <div className="p-4 border-b border-[#7e2562]/10 bg-[#faf6f9]/70 flex items-center justify-between">
          <h3 className="font-bold text-neutral-900 flex items-center text-sm uppercase tracking-wider">
            <ShoppingCartIcon className="w-4 h-4 mr-2 text-[#7e2562]" />
            Current Bill
          </h3>
          <span className="bg-[#faedf5] text-[#7e2562] border border-[#7e2562]/20 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-sm">
            {cart.length} items
          </span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <AnimatePresence>
            {cart.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="h-full flex flex-col items-center justify-center text-neutral-400"
              >
                <Receipt className="w-12 h-12 mb-3 text-neutral-300" />
                <p className="text-xs font-medium">Scan a book or enter barcode to start billing</p>
              </motion.div>
            ) : (
              cart.map(item => (
                <motion.div 
                  key={item.bookId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center justify-between p-3 border border-[#7e2562]/15 rounded-sm hover:border-[#7e2562]/40 transition-colors bg-white shadow-sm"
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="text-xs font-bold text-neutral-900 truncate">{item.title}</p>
                    <p className="text-[11px] text-neutral-500 font-mono truncate">{item.barcode} • {item.author}</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center border border-[#7e2562]/20 rounded-sm overflow-hidden bg-[#faf6f9]/50">
                      <button disabled={!!completedBill} onClick={() => updateQuantity(item.bookId, -1)} className="p-1 hover:bg-[#faedf5] text-neutral-700 disabled:opacity-50">
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center text-xs font-bold font-mono text-neutral-900">{item.quantity}</span>
                      <button disabled={!!completedBill} onClick={() => updateQuantity(item.bookId, 1)} className="p-1 hover:bg-[#faedf5] text-neutral-700 disabled:opacity-50">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="w-20 text-right">
                      <p className="text-xs font-bold text-neutral-900 font-mono">₹{(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                    <button disabled={!!completedBill} onClick={() => removeItem(item.bookId)} className="p-1.5 text-[#e45e34] hover:bg-[#fef5f2] rounded-sm disabled:opacity-50 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Totals Section */}
        <div className="bg-[#faf6f9]/70 p-4 border-t border-[#7e2562]/10">
          <div className="space-y-2 mb-2">
            <div className="flex justify-between text-xs text-neutral-600 font-medium">
              <span>Subtotal</span>
              <span className="font-mono">₹{subTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs items-center">
              <span className="text-neutral-600 font-medium">Discount</span>
              <div className="relative">
                <span className="absolute left-2.5 top-1 text-neutral-500 font-mono">₹</span>
                <input 
                  type="number" 
                  min="0"
                  step="0.01"
                  disabled={!!completedBill}
                  value={discount}
                  onChange={e => setDiscount(Number(e.target.value) || 0)}
                  className="w-24 pl-6 pr-2 py-1 text-right text-xs font-mono border border-[#7e2562]/20 rounded-sm bg-white focus:ring-1 focus:ring-[#7e2562] focus:border-[#7e2562] disabled:opacity-50"
                />
              </div>
            </div>
            <div className="flex justify-between text-base font-bold text-neutral-900 pt-2 border-t border-[#7e2562]/10">
              <span className="uppercase tracking-wider">Total</span>
              <span className="font-mono text-[#7e2562] text-lg">₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Success Overlay for Cart */}
        {completedBill && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] z-10 flex items-center justify-center">
            <div className="text-center p-6 bg-white border border-[#3cb976]/30 rounded-sm shadow-xl">
              <CheckCircle2 className="w-16 h-16 text-[#3cb976] mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-neutral-900 mb-1">Sale Completed!</h2>
              <p className="text-xs text-neutral-600 font-mono mb-2">Bill No: {completedBill.billNumber}</p>
            </div>
          </div>
        )}
      </div>

      {/* Right Pane: Scanner & Checkout Form */}
      <div className="lg:w-96 flex flex-col space-y-6">
        
        {completedBill ? (
          /* SUCCESS STATE PANEL */
          <div className="bg-white rounded-sm border border-[#7e2562]/15 shadow-sm p-6 flex-1 flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-right-4">
            <div className="w-16 h-16 bg-[#f0fbf5] rounded-full flex items-center justify-center mb-6">
              <Receipt className="w-8 h-8 text-[#3cb976]" />
            </div>
            <h3 className="text-xl font-bold text-neutral-900 mb-2">Ready to Print</h3>
            <p className="text-xs text-neutral-500 mb-8">
              The transaction has been successfully recorded. You can now print the invoice or start a new sale.
            </p>

            <div className="space-y-4 w-full">
              <button
                onClick={printBill}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-sm shadow-sm shadow-plum-sm text-xs font-bold uppercase tracking-wider text-white bg-[#7e2562] hover:bg-[#681b50] focus:outline-none transition-colors"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print Bill (PDF)
              </button>
              
              <button
                onClick={startNewSale}
                className="w-full flex justify-center items-center py-3 px-4 border border-neutral-300 rounded-sm shadow-sm text-xs font-bold uppercase tracking-wider text-neutral-700 bg-white hover:bg-[#faf6f9] focus:outline-none transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Start New Sale
              </button>
            </div>
          </div>
        ) : (
          /* NORMAL CHECKOUT PANEL */
          <>
            {/* Scanner Input */}
            <div className="bg-white rounded-sm border border-[#7e2562]/15 shadow-sm p-5">
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">Scan Barcode / ISBN</label>
              <form onSubmit={handleBarcodeSubmit} className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  {isScanning ? (
                    <Loader2 className="h-4 w-4 text-[#7e2562] animate-spin" />
                  ) : (
                    <Search className="h-4 w-4 text-neutral-400" />
                  )}
                </div>
                <input
                  ref={barcodeInputRef}
                  type="text"
                  autoFocus
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="Scan barcode, ISBN, or type code..."
                  className="block w-full pl-9 pr-3 py-2.5 border border-[#7e2562]/20 rounded-sm bg-[#faf6f9]/40 text-neutral-900 focus:ring-1 focus:ring-[#7e2562] focus:bg-white focus:border-[#7e2562] text-xs font-mono transition-colors"
                />
              </form>
              <div className="flex justify-between items-center mt-3">
                <p className="text-[11px] text-neutral-400 flex items-center">
                  <AlertCircle className="w-3 h-3 mr-1 text-[#7e2562]" />
                  Scanner auto-focus is active
                </p>
                <button
                  type="button"
                  onClick={handleBarcodeSubmit}
                  disabled={isScanning || !barcodeInput.trim()}
                  className="text-xs px-3 py-1 bg-[#faedf5] text-[#7e2562] hover:bg-[#f6dbe9] rounded-sm font-bold uppercase tracking-wider transition-colors flex items-center disabled:opacity-50"
                >
                  Enter
                </button>
              </div>
            </div>

            {/* Checkout Details */}
            <div className="bg-white rounded-sm border border-[#7e2562]/15 shadow-sm p-5 flex-1 flex flex-col">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#7e2562] mb-4 border-b border-[#7e2562]/10 pb-2">Checkout Details</h3>
              
              <div className="space-y-4 flex-1" ref={customerDropdownRef}>
                {/* Customer Name Field with Autocomplete */}
                <div className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
                      Customer Name <span className="text-[#e45e34]">*</span>
                    </label>
                    <span className="text-[10px] text-neutral-400">Search past customers</span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={e => {
                        setCustomerName(e.target.value);
                        triggerCustomerSearch(e.target.value, 'name');
                      }}
                      onFocus={() => {
                        if (customerName.trim().length >= 2) {
                          triggerCustomerSearch(customerName, 'name');
                        }
                      }}
                      placeholder="Enter or search customer name"
                      className="block w-full pl-3 pr-8 py-2 border border-[#7e2562]/20 rounded-sm focus:ring-1 focus:ring-[#7e2562] focus:border-[#7e2562] text-xs transition-all"
                    />
                    {isSearchingCustomers && activeSearchField === 'name' ? (
                      <Loader2 className="w-4 h-4 text-[#7e2562] animate-spin absolute right-2.5 top-2.5" />
                    ) : (
                      <User className="w-4 h-4 text-neutral-400 absolute right-2.5 top-2.5 pointer-events-none" />
                    )}
                  </div>

                  {/* Dropdown for Name Search */}
                  {activeSearchField === 'name' && customerSuggestions.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-[#7e2562]/20 rounded-sm shadow-xl max-h-56 overflow-y-auto divide-y divide-neutral-100">
                      <div className="px-3 py-1.5 bg-[#faf6f9] text-[10px] font-bold text-[#7e2562] uppercase tracking-wider flex items-center justify-between">
                        <span>Past Customers Found</span>
                        <span>{customerSuggestions.length} result{customerSuggestions.length !== 1 ? 's' : ''}</span>
                      </div>
                      {customerSuggestions.map((cust, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => selectCustomer(cust)}
                          className="w-full text-left px-3 py-2 hover:bg-[#faedf5] transition-colors flex items-center justify-between group cursor-pointer"
                        >
                          <div className="flex-1 min-w-0 pr-2">
                            <p className="text-xs font-bold text-neutral-900 group-hover:text-[#7e2562] truncate">
                              {cust.customerName}
                            </p>
                            <p className="text-[11px] text-neutral-500 font-mono">
                              {cust.customerPhone ? `📞 ${cust.customerPhone}` : 'No phone recorded'}
                            </p>
                          </div>
                          {cust.lastVisit && (
                            <span className="text-[10px] text-neutral-400 shrink-0">
                              {new Date(cust.lastVisit).toLocaleDateString()}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Customer Phone Field with Autocomplete */}
                <div className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">Customer Phone (Optional)</label>
                    <span className="text-[10px] text-neutral-400">Search by phone</span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={customerPhone}
                      onChange={e => {
                        setCustomerPhone(e.target.value);
                        if (phoneError) setPhoneError('');
                        triggerCustomerSearch(e.target.value, 'phone');
                      }}
                      onFocus={() => {
                        if (customerPhone.trim().length >= 2) {
                          triggerCustomerSearch(customerPhone, 'phone');
                        }
                      }}
                      placeholder="10-digit phone number"
                      className={`block w-full pl-3 pr-8 py-2 border rounded-sm focus:ring-1 focus:ring-[#7e2562] focus:border-[#7e2562] text-xs font-mono transition-all ${
                        phoneError ? 'border-[#e45e34] bg-[#fef5f2]' : 'border-[#7e2562]/20'
                      }`}
                    />
                    {isSearchingCustomers && activeSearchField === 'phone' ? (
                      <Loader2 className="w-4 h-4 text-[#7e2562] animate-spin absolute right-2.5 top-2.5" />
                    ) : (
                      <Phone className="w-4 h-4 text-neutral-400 absolute right-2.5 top-2.5 pointer-events-none" />
                    )}
                  </div>
                  {phoneError && <p className="text-[11px] text-[#e45e34] mt-1">{phoneError}</p>}

                  {/* Dropdown for Phone Search */}
                  {activeSearchField === 'phone' && customerSuggestions.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-[#7e2562]/20 rounded-sm shadow-xl max-h-56 overflow-y-auto divide-y divide-neutral-100">
                      <div className="px-3 py-1.5 bg-[#faf6f9] text-[10px] font-bold text-[#7e2562] uppercase tracking-wider flex items-center justify-between">
                        <span>Past Customers Found</span>
                        <span>{customerSuggestions.length} result{customerSuggestions.length !== 1 ? 's' : ''}</span>
                      </div>
                      {customerSuggestions.map((cust, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => selectCustomer(cust)}
                          className="w-full text-left px-3 py-2 hover:bg-[#faedf5] transition-colors flex items-center justify-between group cursor-pointer"
                        >
                          <div className="flex-1 min-w-0 pr-2">
                            <p className="text-xs font-bold text-neutral-900 group-hover:text-[#7e2562] truncate">
                              {cust.customerName}
                            </p>
                            <p className="text-[11px] text-neutral-500 font-mono">
                              {cust.customerPhone ? `📞 ${cust.customerPhone}` : 'No phone recorded'}
                            </p>
                          </div>
                          {cust.lastVisit && (
                            <span className="text-[10px] text-neutral-400 shrink-0">
                              {new Date(cust.lastVisit).toLocaleDateString()}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">Payment Mode</label>
                  <div className="flex rounded-sm shadow-sm">
                    <button
                      type="button"
                      onClick={() => setPaymentMode('CASH')}
                      className={`flex-1 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-l-sm border transition-colors ${
                        paymentMode === 'CASH' 
                          ? 'bg-[#f0fbf5] border-[#3cb976] text-[#3cb976] z-10' 
                          : 'bg-white border-neutral-300 text-neutral-700 hover:bg-[#faf6f9]'
                      }`}
                    >
                      Cash
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMode('UPI')}
                      className={`flex-1 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-r-sm border-y border-r border-l-0 transition-colors ${
                        paymentMode === 'UPI' 
                          ? 'bg-[#faedf5] border-[#7e2562] text-[#7e2562] z-10' 
                          : 'bg-white border-neutral-300 text-neutral-700 hover:bg-[#faf6f9]'
                      }`}
                    >
                      UPI
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-[#7e2562]/10">
                <button
                  onClick={handleCheckout}
                  disabled={cart.length === 0 || isSubmitting || !customerName.trim()}
                  className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-sm shadow-sm shadow-plum-sm text-xs font-bold uppercase tracking-wider text-white bg-[#7e2562] hover:bg-[#681b50] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-mono"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Receipt className="w-4 h-4 mr-2" />}
                  Complete Sale • ₹{grandTotal.toFixed(2)}
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
              className="bg-white rounded-sm shadow-xl w-full max-w-md p-6 border border-[#7e2562]/20"
            >
              <div className="flex items-center text-[#e45e34] mb-4">
                <AlertCircle className="w-5 h-5 mr-2" />
                <h3 className="text-base font-bold">Book Not Found</h3>
              </div>
              
              <p className="text-neutral-600 mb-4 text-xs">
                Barcode <strong className="text-neutral-900 font-mono">{missingBarcode}</strong> was not found in the catalog.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">Book Title / Description</label>
                  <input
                    type="text"
                    value={enquiryTitle}
                    onChange={e => setEnquiryTitle(e.target.value)}
                    placeholder="E.g., Harry Potter - Part 1"
                    className="block w-full px-3 py-2 border border-[#7e2562]/20 rounded-sm focus:ring-1 focus:ring-[#7e2562] focus:border-[#7e2562] text-xs"
                  />
                </div>
                
                <div className="flex justify-end space-x-3 mt-6 pt-3 border-t border-[#7e2562]/10">
                  <button
                    onClick={() => {
                      setShowEnquiryModal(false);
                      barcodeInputRef.current?.focus();
                    }}
                    className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-neutral-700 bg-white border border-neutral-300 rounded-sm hover:bg-neutral-50 transition-colors"
                  >
                    Cancel
                  </button>
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
