"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import { api } from '@/lib/api';
import { X, ArrowRight, ArrowLeftRight, Loader2, Ban, Clipboard, FileText, CheckCircle2, Clock, Plus, Minus, Check, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TransferDetailsModalProps {
  transferId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedTransfer?: any) => void;
}

export default function TransferDetailsModal({ transferId, isOpen, onClose, onSuccess }: TransferDetailsModalProps) {
  const { user } = useAuth();
  const confirm = useConfirm();
  const [transfer, setTransfer] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Rejection note
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectionNote, setRejectionNote] = useState('');

  // Routing State for Central Manager (Single or Multi-branch)
  const [isRoutingOpen, setIsRoutingOpen] = useState(false);
  const [selectedRouteSource, setSelectedRouteSource] = useState('');
  const [branches, setBranches] = useState<any[]>([]);
  const [routingStocks, setRoutingStocks] = useState<any[]>([]);
  const [loadingRoutingStocks, setLoadingRoutingStocks] = useState(false);
  const [splitAllocations, setSplitAllocations] = useState<{ [branchId: string]: number }>({});
  
  // Partial fulfillment and partial receiving states
  const [fulfillmentMode, setFulfillmentMode] = useState<'FULL' | 'PARTIAL'>('FULL');
  const [receiveQuantities, setReceiveQuantities] = useState<{ [bookId: string]: number }>({});
  const [receiptDiscrepancyNote, setReceiptDiscrepancyNote] = useState('');

  const fetchBranches = async () => {
    try {
      const res = await api.get('/branches');
      if (res.success && res.data) {
        setBranches(res.data.items || (Array.isArray(res.data) ? res.data : []));
      }
    } catch (e) {
      console.error('Failed to fetch branches', e);
    }
  };

  const fetchTransferDetails = async () => {
    if (!transferId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/transfers/${transferId}`);
      if (response.success && response.data) {
        const transData = response.data;
        setTransfer(transData);
        setSelectedRouteSource(transData.fromBranchId);

        // Initialize receive quantities
        const initialReceive: { [bookId: string]: number } = {};
        transData.items?.forEach((item: any) => {
          initialReceive[item.bookId] = Number(item.quantityDispatched || item.quantityRequested || 0);
        });
        setReceiveQuantities(initialReceive);
        
        // If there's an item, fetch chain stock availability
        if (transData.items && transData.items.length > 0) {
          const firstBook = transData.items[0];
          const totalQty = transData.items.reduce((s: number, i: any) => s + (Number(i.quantityRequested) || 0), 0);
          fetchStockForRouting(firstBook.bookId, totalQty, transData);
        }
      }
    } catch (err) {
      console.error('Failed to fetch transfer details:', err);
      setError('Failed to load transfer details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStockForRouting = async (bookId: string, requestedQty = 1, currentTransfer?: any) => {
    setLoadingRoutingStocks(true);
    try {
      const res = await api.get(`/transfers/stock-by-book?bookId=${bookId}`);
      if (res.success && res.data) {
        const stocks = res.data;
        setRoutingStocks(stocks);

        const targetTransfer = currentTransfer || transfer;
        const initialMap: { [bId: string]: number } = {};
        const availableSources = stocks.filter((s: any) => s.branchId !== targetTransfer?.toBranchId);

        // Pre-fill allocation for current source branch or single source if found
        const currentSrc = availableSources.find((s: any) => s.branchId === targetTransfer?.fromBranchId);
        if (currentSrc && currentSrc.quantity > 0) {
          initialMap[currentSrc.branchId] = Math.min(requestedQty, currentSrc.quantity);
        } else if (availableSources.length === 1) {
          initialMap[availableSources[0].branchId] = Math.min(requestedQty, availableSources[0].quantity);
        }
        setSplitAllocations(initialMap);
      }
    } catch (e) {
      console.error('Failed to fetch routing stock:', e);
    } finally {
      setLoadingRoutingStocks(false);
    }
  };

  useEffect(() => {
    if (isOpen && transferId) {
      setRejectMode(false);
      setRejectionNote('');
      setIsRoutingOpen(false);
      setSplitAllocations({});
      fetchBranches();
      fetchTransferDetails();
    }
  }, [isOpen, transferId]);

  const handleSaveRoute = async () => {
    if (!selectedRouteSource || !transfer) return;
    if (selectedRouteSource === transfer.toBranchId) {
      setError('Source branch cannot be the same as destination branch.');
      return;
    }

    setActionLoading(true);
    setError(null);

    try {
      const res = await api.patch(`/transfers/${transfer.id}`, {
        fromBranchId: selectedRouteSource,
      });
      if (res.success && res.data) {
        setTransfer(res.data);
        onSuccess(res.data);
        setIsRoutingOpen(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to re-route transfer source.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSplitSubmit = async (dispatchNow = false) => {
    if (!transfer) return;

    const firstBook = transfer.items?.[0];
    const allocations = Object.entries(splitAllocations)
      .filter(([branchId, qty]) => branchId !== transfer.toBranchId && Number(qty) > 0)
      .map(([branchId, qty]) => ({
        branchId,
        quantity: Number(qty),
        bookId: firstBook?.bookId || transfer.items?.[0]?.bookId,
      }));

    if (allocations.length === 0) {
      setError('Please allocate at least 1 copy from an available branch or warehouse.');
      return;
    }

    const totalAlloc = allocations.reduce((sum, a) => sum + a.quantity, 0);

    const ok = await confirm({
      title: dispatchNow ? "Confirm Multi-Branch Stock Dispatch" : "Confirm Multi-Branch Allocation",
      message: dispatchNow
        ? `Dispatch ${totalAlloc} copies to "${transfer.toBranch?.name}" across ${allocations.length} source location(s)? Stock will be deducted immediately from each branch inventory.`
        : `Save allocation for ${totalAlloc} copies across ${allocations.length} source location(s)?`,
      confirmText: dispatchNow ? "Yes, Dispatch from Selected Branches" : "Yes, Save Allocation",
      cancelText: "No, Cancel",
      variant: dispatchNow ? "primary" : "primary",
    });
    if (!ok) return;

    setActionLoading(true);
    setError(null);

    try {
      const res = await api.post(`/transfers/${transfer.id}/split`, {
        allocations,
        dispatchNow,
      });
      if (res.success && res.data) {
        const primary = Array.isArray(res.data) ? res.data[0] : res.data;
        setTransfer(primary);
        onSuccess(primary);
        setTimeout(() => onClose(), 400);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to split transfer.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDispatch = async () => {
    if (!transfer) return;

    const ok = await confirm({
      title: "Confirm Stock Dispatch",
      message: `Are you sure you want to dispatch transfer #${transfer.transferNumber || transfer.id.slice(0, 8)} to ${transfer.toBranch?.name || 'destination branch'}?`,
      confirmText: "Yes, Dispatch Stock",
      cancelText: "No, Cancel",
      variant: "primary",
    });
    if (!ok) return;

    setActionLoading(true);
    setError(null);

    // Instant optimistic update
    const optimistic = {
      ...transfer,
      status: 'DISPATCHED',
      items: transfer.items?.map((i: any) => ({
        ...i,
        quantityDispatched: i.quantityRequested
      }))
    };
    setTransfer(optimistic);
    onSuccess(optimistic);

    try {
      const response = await api.post(`/transfers/${transfer.id}/dispatch`);
      const updated = response.data || optimistic;
      setTransfer(updated);
      onSuccess(updated);
      setTimeout(() => onClose(), 400);
    } catch (err: any) {
      setTransfer(transfer);
      setError(err.response?.data?.message || 'Failed to dispatch transfer.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReceive = async () => {
    if (!transfer) return;

    const totalDispatched = transfer.items?.reduce((s: number, i: any) => s + Number(i.quantityDispatched || i.quantityRequested || 0), 0) || 0;
    const totalReceived = transfer.items?.reduce((s: number, i: any) => s + (receiveQuantities[i.bookId] !== undefined ? receiveQuantities[i.bookId] : Number(i.quantityDispatched || i.quantityRequested || 0)), 0) || 0;

    const isPartial = totalReceived < totalDispatched;

    const ok = await confirm({
      title: isPartial ? "Confirm Partial Stock Receipt" : "Confirm Stock Receipt",
      message: isPartial 
        ? `You are confirming receipt of ${totalReceived} of ${totalDispatched} dispatched copies into "${transfer.toBranch?.name}"'s inventory. Proceed with partial receipt?`
        : `Are you sure you want to confirm receipt of all ${totalReceived} copies into "${transfer.toBranch?.name}"'s inventory?`,
      confirmText: isPartial ? "Yes, Confirm Partial Receipt" : "Yes, Receive Stock",
      cancelText: "No, Cancel",
      variant: "success",
    });
    if (!ok) return;

    setActionLoading(true);
    setError(null);

    const receivePayload = {
      items: transfer.items?.map((i: any) => ({
        bookId: i.bookId,
        quantityReceived: receiveQuantities[i.bookId] !== undefined ? receiveQuantities[i.bookId] : (i.quantityDispatched || i.quantityRequested)
      })),
      note: receiptDiscrepancyNote.trim() || undefined,
    };

    // Instant optimistic update
    const optimistic = {
      ...transfer,
      status: 'RECEIVED',
      items: transfer.items?.map((i: any) => ({
        ...i,
        quantityReceived: receiveQuantities[i.bookId] !== undefined ? receiveQuantities[i.bookId] : (i.quantityDispatched || i.quantityRequested)
      }))
    };
    setTransfer(optimistic);
    onSuccess(optimistic);

    try {
      const response = await api.post(`/transfers/${transfer.id}/receive`, receivePayload);
      const updated = response.data || optimistic;
      setTransfer(updated);
      onSuccess(updated);
      setTimeout(() => onClose(), 400);
    } catch (err: any) {
      setTransfer(transfer);
      setError(err.response?.data?.message || 'Failed to receive transfer.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!transfer) return;

    const ok = await confirm({
      title: "Reject Transfer Request",
      message: `Are you sure you want to reject transfer #${transfer.transferNumber || transfer.id.slice(0, 8)}?`,
      confirmText: "Yes, Reject Transfer",
      cancelText: "No, Go Back",
      variant: "danger",
    });
    if (!ok) return;

    setActionLoading(true);
    setError(null);

    const optimistic = { ...transfer, status: 'REJECTED' };
    setTransfer(optimistic);
    onSuccess(optimistic);

    try {
      const response = await api.post(`/transfers/${transfer.id}/reject`, { note: rejectionNote });
      const updated = response.data || optimistic;
      setTransfer(updated);
      onSuccess(updated);
      setTimeout(() => onClose(), 400);
    } catch (err: any) {
      setTransfer(transfer);
      setError(err.response?.data?.message || 'Failed to reject transfer.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!transfer) return;
    const ok = await confirm({
      title: "Cancel Transfer Request",
      message: "Are you sure you want to cancel this transfer request? This action cannot be undone.",
      confirmText: "Yes, Cancel Transfer",
      cancelText: "No, Keep",
      variant: "danger",
    });
    if (!ok) return;

    setActionLoading(true);
    setError(null);

    const optimistic = { ...transfer, status: 'CANCELLED' };
    setTransfer(optimistic);
    onSuccess(optimistic);

    try {
      const response = await api.post(`/transfers/${transfer.id}/cancel`);
      const updated = response.data || optimistic;
      setTransfer(updated);
      onSuccess(updated);
      setTimeout(() => onClose(), 400);
    } catch (err: any) {
      setTransfer(transfer);
      setError(err.response?.data?.message || 'Failed to cancel transfer.');
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen) return null;

  const isSuperAdmin = user?.roles?.includes('SUPER_ADMIN');
  const isAdmin = user?.roles?.includes('ADMIN');
  const isCentralInventory = user?.roles?.includes('CENTRAL_INVENTORY_MANAGER');

  const isFromWarehouse = transfer?.fromBranch?.type === 'WAREHOUSE';
  const isToWarehouse = transfer?.toBranch?.type === 'WAREHOUSE';

  const isSourceBranchUser = user?.branchId === transfer?.fromBranchId;
  const isDestBranchUser = user?.branchId === transfer?.toBranchId;

  // Actions visibility
  const canDispatch = transfer?.status === 'PENDING' && (
    (isFromWarehouse && (isCentralInventory || isAdmin || isSuperAdmin || isSourceBranchUser)) ||
    (!isFromWarehouse && (isSourceBranchUser || isAdmin || isSuperAdmin))
  );

  const canReceive = transfer?.status === 'DISPATCHED' && (
    (isToWarehouse && (isCentralInventory || isAdmin || isSuperAdmin || isDestBranchUser)) ||
    (!isToWarehouse && (isDestBranchUser || isSuperAdmin))
  );

  const canReject = transfer?.status === 'PENDING' && (
    (isFromWarehouse && (isCentralInventory || isAdmin || isSuperAdmin)) ||
    isSourceBranchUser
  );

  const canCancel = transfer?.status === 'PENDING' && (
    isDestBranchUser ||
    (isToWarehouse && isCentralInventory) ||
    isSuperAdmin
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-amber-50 border-amber-200 text-amber-800';
      case 'DISPATCHED':
        return 'bg-[#faedf5] border-[#7e2562]/20 text-[#7e2562] animate-pulse font-bold';
      case 'RECEIVED':
        return 'bg-[#f0fbf5] border-[#3cb976]/30 text-[#3cb976] font-bold';
      case 'REJECTED':
      case 'CANCELLED':
        return 'bg-[#fef5f2] border-[#e45e34]/30 text-[#e45e34] font-bold';
      default:
        return 'bg-neutral-100 border-neutral-200 text-neutral-700';
    }
  };

  const router = typeof window !== 'undefined' ? require('next/navigation').useRouter?.() : null;

  const handleCreatePo = (bookId: string, qty: number) => {
    onClose();
    if (typeof window !== 'undefined') {
      window.location.href = `/dashboard/purchase-orders?createPo=true&bookId=${bookId}&qty=${qty}&transferId=${transfer.id}`;
    }
  };

  const totalRequestedQty = transfer?.items?.reduce((acc: number, i: any) => acc + Number(i.quantityRequested || 0), 0) || 0;
  const firstBook = transfer?.items?.[0];
  const totalChainStock = routingStocks.reduce((acc, s) => acc + (s.quantity || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-sm shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92dvh] border border-[#7e2562]/15"
        >
          {/* Header */}
          <div className="p-4 sm:px-6 sm:py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-[#faedf5]/60 to-[#faf6f9] shrink-0">
            <div className="min-w-0 pr-2">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2 truncate">
                <span>Transfer Details</span>
                {transfer && (
                  <span className={`px-2 py-0.5 border text-xs font-bold rounded-sm ${getStatusBadge(transfer.status)}`}>
                    {transfer.status}
                  </span>
                )}
              </h3>
              {transfer && <p className="text-xs font-mono text-gray-500 mt-0.5">{transfer.transferNumber}</p>}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-[#faedf5] rounded-sm transition shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-4 sm:space-y-5">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-3 text-gray-400 font-medium">
                <Loader2 className="w-8 h-8 animate-spin text-[#7e2562]" />
                <span className="text-xs">Loading transfer details...</span>
              </div>
            ) : error ? (
              <div className="p-4 bg-[#fef5f2] border border-[#e45e34]/20 rounded-sm text-[#e45e34] text-xs font-semibold flex items-center space-x-2">
                <X className="w-4 h-4 text-[#e45e34] shrink-0" />
                <span>{error}</span>
              </div>
            ) : transfer ? (
              <div className="space-y-4 sm:space-y-5">
                {/* Branch route mapping */}
                <div className="p-3 sm:p-4 bg-[#faf6f9]/60 border border-[#7e2562]/10 rounded-sm flex items-center justify-between gap-2">
                  <div className="flex-1 text-center pr-2">
                    <p className="text-[10px] font-bold text-[#7e2562] uppercase tracking-wider">Fulfillment Source (From)</p>
                    <p className="text-xs sm:text-sm font-bold text-gray-900 mt-0.5 truncate">{transfer.fromBranch?.name}</p>
                    <span className="text-[11px] text-gray-400 font-mono">({transfer.fromBranch?.code})</span>
                  </div>
                  
                  <div className="p-2 bg-[#faedf5] border border-[#7e2562]/20 rounded-sm shrink-0">
                    <ArrowRight className="w-4 h-4 text-[#7e2562]" />
                  </div>

                  <div className="flex-1 text-center pl-2">
                    <p className="text-[10px] font-bold text-[#7e2562] uppercase tracking-wider">Requesting Branch (To)</p>
                    <p className="text-xs sm:text-sm font-bold text-gray-900 mt-0.5 truncate">{transfer.toBranch?.name}</p>
                    <span className="text-[11px] text-gray-400 font-mono">({transfer.toBranch?.code})</span>
                  </div>
                </div>

                {/* Transfer metadata */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-gray-50/70 p-3 rounded-sm border border-gray-200/70">
                  <div>
                    <span className="text-gray-400 block font-semibold uppercase tracking-wider text-[10px]">Requested By</span>
                    <span className="font-bold text-gray-900 mt-0.5 block">{transfer.requestedBy?.name || 'Branch Manager'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block font-semibold uppercase tracking-wider text-[10px]">Requested Date</span>
                    <span className="font-bold text-gray-900 mt-0.5 block">
                      {new Date(transfer.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-gray-400 block font-semibold uppercase tracking-wider text-[10px]">Total Books</span>
                    <span className="font-bold text-[#7e2562] mt-0.5 block">{transfer.items?.length} titles ({totalRequestedQty} copies)</span>
                  </div>
                </div>

                {/* LINKED PURCHASE ORDER CARD (IF PO CREATED) */}
                {transfer.purchaseOrder && (
                  <div className={`p-3.5 rounded-sm border ${
                    transfer.purchaseOrder.status === 'RECEIVED' 
                      ? 'bg-[#f0fbf5] border-[#3cb976]/30 text-emerald-950'
                      : 'bg-[#faedf5]/70 border-[#7e2562]/20 text-gray-900'
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center space-x-2.5">
                        <div className={`p-1.5 rounded-sm ${
                          transfer.purchaseOrder.status === 'RECEIVED' ? 'bg-[#3cb976] text-white' : 'bg-[#7e2562] text-white'
                        }`}>
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider">
                              Procurement Linked: PO #{transfer.purchaseOrder.orderNumber}
                            </span>
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-sm border ${
                              transfer.purchaseOrder.status === 'RECEIVED'
                                ? 'bg-[#f0fbf5] text-[#3cb976] border-[#3cb976]/30'
                                : transfer.purchaseOrder.status === 'PLACED'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}>
                              {transfer.purchaseOrder.status}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mt-0.5">
                            Supplier: <strong>{transfer.purchaseOrder.supplier?.name || 'Kairali Books'}</strong>
                            {transfer.purchaseOrder.expectedDate && ` • Expected: ${new Date(transfer.purchaseOrder.expectedDate).toLocaleDateString()}`}
                          </p>
                        </div>
                      </div>

                      <a
                        href="/dashboard/purchase-orders"
                        className="text-xs font-bold text-[#7e2562] hover:underline self-end sm:self-auto"
                      >
                        View in PO Section →
                      </a>
                    </div>

                    {transfer.purchaseOrder.status === 'RECEIVED' && (
                      <div className="mt-2.5 pt-2 border-t border-[#3cb976]/20 text-xs text-emerald-900 font-semibold flex items-center justify-between">
                        <span>✓ Stock has arrived at Central Warehouse and is ready to pass to <strong>{transfer.toBranch?.name}</strong>.</span>
                      </div>
                    )}
                  </div>
                )}

                {/* CENTRAL INVENTORY MULTI-BRANCH STOCK ALLOCATION & ROUTING PANEL */}
                {(isCentralInventory || isAdmin || isSuperAdmin) && transfer.status === 'PENDING' && (
                  <div className="p-3.5 sm:p-4 bg-[#faf6f9] border border-[#7e2562]/20 rounded-sm space-y-3 shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#7e2562]/10 pb-2.5">
                      <div className="flex items-center space-x-2">
                        <Layers className="w-4 h-4 text-[#7e2562]" />
                        <span className="text-xs font-bold text-[#7e2562] uppercase tracking-wider">
                          Central Stock Allocation & Sourcing
                        </span>
                      </div>
                      
                      {/* Full vs Partial Fulfillment Mode Toggle */}
                      <div className="flex items-center bg-white p-0.5 border border-[#7e2562]/20 rounded-sm shadow-2xs self-start sm:self-auto">
                        <button
                          type="button"
                          onClick={() => setFulfillmentMode('FULL')}
                          className={`px-2.5 py-1 text-[11px] font-bold rounded-sm transition cursor-pointer ${
                            fulfillmentMode === 'FULL'
                              ? 'bg-[#7e2562] text-white shadow-2xs'
                              : 'text-gray-600 hover:text-gray-900 hover:bg-[#faedf5]'
                          }`}
                        >
                          Full Fulfillment
                        </button>
                        <button
                          type="button"
                          onClick={() => setFulfillmentMode('PARTIAL')}
                          className={`px-2.5 py-1 text-[11px] font-bold rounded-sm transition cursor-pointer ${
                            fulfillmentMode === 'PARTIAL'
                              ? 'bg-[#7e2562] text-white shadow-2xs'
                              : 'text-gray-600 hover:text-gray-900 hover:bg-[#faedf5]'
                          }`}
                        >
                          Partial Fulfillment
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-gray-500 font-medium">
                      <span>
                        Requested: <strong className="text-gray-900">{totalRequestedQty} copies</strong>
                        {fulfillmentMode === 'PARTIAL' && (
                          <span className="ml-2 px-1.5 py-0.2 bg-amber-50 text-amber-800 border border-amber-200 rounded-sm font-bold text-[10px]">
                            Partial Mode Enabled
                          </span>
                        )}
                      </span>
                      <span>
                        Total Chain Stock: <strong className={totalChainStock > 0 ? "text-[#3cb976] font-bold" : "text-[#e45e34] font-bold"}>{totalChainStock} copies</strong>
                      </span>
                    </div>

                    {/* Stock across branches preview & allocation */}
                    {loadingRoutingStocks ? (
                      <div className="py-6 flex items-center justify-center text-xs text-gray-500">
                        <Loader2 className="w-4 h-4 animate-spin text-[#7e2562] mr-2" />
                        Fetching real-time chain inventory...
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-[11px] text-gray-500">
                          {fulfillmentMode === 'FULL' 
                            ? `Select source branch(es) to fulfill all ${totalRequestedQty} requested copies:`
                            : `Select source branch(es) to fulfill a partial allocation (less than ${totalRequestedQty} copies):`}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {routingStocks.length === 0 ? (
                            <div className="col-span-2 p-3 bg-amber-50 border border-amber-200 rounded-sm text-amber-900 flex items-center justify-between">
                              <span className="text-xs font-medium">
                                ⚠ This title is currently <strong>out of stock</strong> across all retail branches and warehouse.
                              </span>
                            </div>
                          ) : (
                            routingStocks.map((s: any) => {
                              const isDestination = s.branchId === transfer.toBranchId;
                              const allocatedQty = splitAllocations[s.branchId] || 0;

                              return (
                                <div
                                  key={s.branchId}
                                  className={`p-2.5 rounded-sm border transition-all ${
                                    isDestination
                                      ? 'bg-gray-100/70 border-gray-200 text-gray-400 opacity-60'
                                      : allocatedQty > 0
                                        ? 'bg-white border-[#7e2562] shadow-xs ring-1 ring-[#7e2562]/30'
                                        : 'bg-white border-gray-200 hover:border-gray-300 text-gray-800'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0 pr-1">
                                      <div className="font-bold truncate text-xs text-gray-900">
                                        {s.branchName}
                                        {isDestination && ' (Destination)'}
                                      </div>
                                      <div className="flex items-center gap-1.5 text-[10px] text-gray-500 mt-0.5">
                                        <span className="font-mono text-gray-400">{s.branchCode}</span>
                                        <span>•</span>
                                        <span>In stock: <strong className="text-[#3cb976] font-bold">{s.quantity}</strong></span>
                                      </div>
                                    </div>

                                    {!isDestination && (
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <div className="flex items-center border border-[#7e2562]/25 rounded-sm overflow-hidden bg-white shadow-2xs h-7">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const current = splitAllocations[s.branchId] || 0;
                                              setSplitAllocations(prev => ({ ...prev, [s.branchId]: Math.max(0, current - 1) }));
                                            }}
                                            disabled={allocatedQty <= 0}
                                            className="px-2 h-full hover:bg-[#faedf5] text-gray-700 text-xs font-bold border-r border-[#7e2562]/20 disabled:opacity-30 cursor-pointer"
                                          >
                                            -
                                          </button>
                                          <input
                                            type="number"
                                            min={0}
                                            max={s.quantity}
                                            value={allocatedQty === 0 ? '' : allocatedQty}
                                            placeholder="0"
                                            onChange={(e) => {
                                              const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                                              if (isNaN(val)) return;
                                              const clamped = Math.max(0, Math.min(s.quantity, val));
                                              setSplitAllocations(prev => ({ ...prev, [s.branchId]: clamped }));
                                            }}
                                            className="w-10 text-center text-xs font-bold text-gray-900 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none bg-transparent"
                                          />
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const current = splitAllocations[s.branchId] || 0;
                                              setSplitAllocations(prev => ({ ...prev, [s.branchId]: Math.min(s.quantity, current + 1) }));
                                            }}
                                            disabled={allocatedQty >= s.quantity}
                                            className="px-2 h-full hover:bg-[#faedf5] text-gray-700 text-xs font-bold border-l border-[#7e2562]/20 disabled:opacity-30 cursor-pointer"
                                          >
                                            +
                                          </button>
                                        </div>

                                        <button
                                          type="button"
                                          onClick={() => {
                                            const otherAllocated = Object.entries(splitAllocations).reduce((sum, [bId, q]) => {
                                              if (bId === s.branchId || bId === transfer.toBranchId) return sum;
                                              return sum + (Number(q) || 0);
                                            }, 0);
                                            const needed = Math.max(0, totalRequestedQty - otherAllocated);
                                            const fillQty = Math.min(s.quantity, needed > 0 ? needed : s.quantity);
                                            setSplitAllocations(prev => ({ ...prev, [s.branchId]: fillQty }));
                                          }}
                                          className={`px-2 py-1 text-[10px] font-bold rounded-sm border transition-all cursor-pointer ${
                                            allocatedQty > 0
                                              ? 'bg-[#faedf5] text-[#7e2562] border-[#7e2562]/30 hover:bg-[#7e2562] hover:text-white'
                                              : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-[#faedf5] hover:text-[#7e2562]'
                                          }`}
                                          title="Fill copies from this branch"
                                        >
                                          {allocatedQty > 0 ? 'Max' : 'Fill'}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* ALLOCATION SUMMARY BAR */}
                        {routingStocks.length > 0 && (
                          <div className="p-2.5 bg-white border border-[#7e2562]/15 rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-600 font-semibold">
                                Allocated: <strong className="text-gray-900 font-bold font-mono text-sm">{
                                  Object.entries(splitAllocations).reduce((sum, [bId, q]) => (bId === transfer.toBranchId ? sum : sum + (Number(q) || 0)), 0)
                                }</strong> / <span className="font-bold">{totalRequestedQty} copies</span>
                              </span>
                              {Object.entries(splitAllocations).reduce((sum, [bId, q]) => (bId === transfer.toBranchId ? sum : sum + (Number(q) || 0)), 0) === totalRequestedQty && (
                                <span className="px-2 py-0.5 text-[10px] font-bold bg-[#f0fbf5] text-[#3cb976] border border-[#3cb976]/30 rounded-sm">
                                  ✓ 100% Allocated
                                </span>
                              )}
                              {Object.entries(splitAllocations).reduce((sum, [bId, q]) => (bId === transfer.toBranchId ? sum : sum + (Number(q) || 0)), 0) < totalRequestedQty && (
                                <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 rounded-sm">
                                  {fulfillmentMode === 'PARTIAL' ? '⚡ Partial Allocation' : `⚠ ${totalRequestedQty - Object.entries(splitAllocations).reduce((sum, [bId, q]) => (bId === transfer.toBranchId ? sum : sum + (Number(q) || 0)), 0)} copies short`}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-auto">
                              <button
                                type="button"
                                onClick={() => handleSplitSubmit(true)}
                                disabled={actionLoading || Object.entries(splitAllocations).reduce((sum, [bId, q]) => (bId === transfer.toBranchId ? sum : sum + (Number(q) || 0)), 0) === 0}
                                className="px-3.5 py-1.5 bg-[#7e2562] hover:bg-[#681b50] text-white text-xs font-bold rounded-sm shadow-xs transition disabled:opacity-50 inline-flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clipboard className="w-3.5 h-3.5" />}
                                <span>
                                  {fulfillmentMode === 'PARTIAL' && Object.entries(splitAllocations).reduce((sum, [bId, q]) => (bId === transfer.toBranchId ? sum : sum + (Number(q) || 0)), 0) < totalRequestedQty
                                    ? `Dispatch Partial Stock (${Object.entries(splitAllocations).reduce((sum, [bId, q]) => (bId === transfer.toBranchId ? sum : sum + (Number(q) || 0)), 0)} copies)`
                                    : 'Dispatch from Selected Branches'}
                                </span>
                              </button>

                              {/* <button
                                type="button"
                                onClick={() => handleSplitSubmit(false)}
                                disabled={actionLoading || Object.entries(splitAllocations).reduce((sum, [bId, q]) => (bId === transfer.toBranchId ? sum : sum + (Number(q) || 0)), 0) === 0}
                                className="px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 text-xs font-semibold rounded-sm transition disabled:opacity-50 cursor-pointer"
                              >
                                Save Route
                              </button> */}
                            </div>
                          </div>
                        )}

                        {/* OUT OF STOCK OR NEED REORDER: CREATE PURCHASE ORDER BUTTON */}
                        {!transfer.purchaseOrder && (
                          <div className="pt-2 flex justify-end border-t border-[#7e2562]/10">
                            <button
                              type="button"
                              onClick={() => {
                                const allocated = Object.entries(splitAllocations).reduce((sum, [bId, q]) => (bId === transfer.toBranchId ? sum : sum + (Number(q) || 0)), 0);
                                const needed = Math.max(1, totalRequestedQty - allocated);
                                handleCreatePo(firstBook?.bookId, needed);
                              }}
                              className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-sm transition inline-flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5 text-amber-700" />
                              <span>Create Purchase Order (PO)</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Items List Table */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#7e2562] uppercase tracking-wider block">Requested Books</label>
                    {canReceive && (
                      <span className="text-[10px] font-bold text-[#3cb976] bg-[#f0fbf5] px-2 py-0.5 border border-[#3cb976]/30 rounded-sm">
                        Verify & Adjust Received Quantities Below
                      </span>
                    )}
                  </div>

                  <div className="border border-[#7e2562]/15 rounded-sm overflow-x-auto bg-white shadow-xs">
                    <table className="min-w-[480px] w-full text-left text-xs">
                      <thead className="bg-[#faf6f9]/70 text-[11px] font-bold text-[#7e2562] uppercase tracking-wider border-b border-[#7e2562]/10 whitespace-nowrap">
                        <tr>
                          <th className="px-4 py-2.5">Book Details</th>
                          <th className="px-4 py-2.5 text-center">Requested</th>
                          <th className="px-4 py-2.5 text-center">Dispatched</th>
                          <th className="px-4 py-2.5 text-center">{canReceive ? 'Received (Verify)' : 'Received'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {transfer.items.map((item: any) => {
                          const maxReceivable = item.quantityDispatched || item.quantityRequested;
                          const curReceived = receiveQuantities[item.bookId] !== undefined ? receiveQuantities[item.bookId] : maxReceivable;

                          return (
                            <tr key={item.id} className="hover:bg-[#faf6f9]/30 transition-colors">
                              <td className="px-4 py-3 min-w-0">
                                <p className="font-bold text-gray-900 truncate">{item.book.title}</p>
                                <p className="text-[11px] text-gray-400 font-mono mt-0.5">{item.book.isbn}</p>
                              </td>
                              <td className="px-4 py-3 text-center font-bold text-gray-900">{item.quantityRequested}</td>
                              <td className="px-4 py-3 text-center font-bold text-[#7e2562]">{item.quantityDispatched}</td>
                              <td className="px-4 py-3 text-center font-bold">
                                {canReceive ? (
                                  <div className="flex items-center justify-center gap-1">
                                    <div className="flex items-center border border-[#3cb976]/40 rounded-sm overflow-hidden bg-white shadow-2xs h-7">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setReceiveQuantities(prev => ({ ...prev, [item.bookId]: Math.max(0, curReceived - 1) }));
                                        }}
                                        disabled={curReceived <= 0}
                                        className="px-2 h-full hover:bg-emerald-50 text-gray-700 text-xs font-bold border-r border-[#3cb976]/20 disabled:opacity-30 cursor-pointer"
                                      >
                                        -
                                      </button>
                                      <input
                                        type="number"
                                        min={0}
                                        max={maxReceivable}
                                        value={curReceived === 0 ? '' : curReceived}
                                        placeholder="0"
                                        onChange={(e) => {
                                          const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                                          if (isNaN(val)) return;
                                          const clamped = Math.max(0, Math.min(maxReceivable, val));
                                          setReceiveQuantities(prev => ({ ...prev, [item.bookId]: clamped }));
                                        }}
                                        className="w-10 text-center text-xs font-bold text-gray-900 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none bg-transparent"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setReceiveQuantities(prev => ({ ...prev, [item.bookId]: Math.min(maxReceivable, curReceived + 1) }));
                                        }}
                                        disabled={curReceived >= maxReceivable}
                                        className="px-2 h-full hover:bg-emerald-50 text-gray-700 text-xs font-bold border-l border-[#3cb976]/20 disabled:opacity-30 cursor-pointer"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-[#3cb976]">{item.quantityReceived}</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Partial Receipt Discrepancy Note */}
                  {canReceive && transfer.items.some((i: any) => (receiveQuantities[i.bookId] ?? (i.quantityDispatched || i.quantityRequested)) < (i.quantityDispatched || i.quantityRequested)) && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-sm space-y-1 text-xs">
                      <label className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block">
                        Partial Receipt Discrepancy Note (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 1 copy damaged in transit, box was torn..."
                        value={receiptDiscrepancyNote}
                        onChange={(e) => setReceiptDiscrepancyNote(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-amber-300 rounded-sm bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  )}
                </div>

                {/* Request Note placed at the bottom */}
                {transfer.note && (
                  <div className="p-3 bg-[#faf6f9]/60 border border-[#7e2562]/15 rounded-sm flex items-start space-x-2 text-gray-700 text-xs leading-relaxed shadow-2xs">
                    <FileText className="w-4 h-4 text-[#7e2562] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-[#7e2562] block mb-0.5">Request Note</span>
                      {transfer.note}
                    </div>
                  </div>
                )}

                {/* Rejection input field */}
                {rejectMode && (
                  <div className="space-y-2 p-3 sm:p-4 bg-[#fef5f2] border border-[#e45e34]/20 rounded-sm">
                    <label className="text-xs font-bold text-[#e45e34] block uppercase tracking-wider">Rejection Reason</label>
                    <input
                      type="text"
                      placeholder="Why is this transfer being rejected?"
                      value={rejectionNote}
                      onChange={(e) => setRejectionNote(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-[#e45e34]/30 rounded-sm focus:outline-none focus:ring-1 focus:ring-[#e45e34] bg-white"
                    />
                    <div className="flex justify-end space-x-2 mt-2">
                      <button
                        onClick={() => setRejectMode(false)}
                        className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-white rounded-sm border border-gray-200"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleReject}
                        disabled={!rejectionNote.trim() || actionLoading}
                        className="px-3 py-1.5 text-xs font-bold bg-[#e45e34] hover:bg-[#d04e26] text-white rounded-sm shadow-xs disabled:opacity-50"
                      >
                        Confirm Reject
                      </button>
                    </div>
                  </div>
                )}

                {/* Awaiting Receipt Notice for non-destination users */}
                {transfer.status === 'DISPATCHED' && !canReceive && (
                  <div className="p-3.5 bg-[#faedf5]/60 border border-[#7e2562]/20 rounded-sm text-xs text-[#7e2562] flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-[#7e2562] shrink-0" />
                    <div>
                      <p className="font-bold">In Transit — Awaiting Destination Confirmation</p>
                      <p className="text-gray-600 mt-0.5">
                        Stock has been dispatched. Physical receipt and stock confirmation must be confirmed by the destination branch manager at <strong>{transfer.toBranch?.name}</strong>.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Footer Actions */}
          {transfer && !rejectMode && (
            <div className="p-4 sm:px-6 sm:py-3 border-t border-gray-200 bg-gray-50 flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-center gap-2.5 shrink-0">
              {/* Cancel Request Action */}
              <div>
                {canCancel && (
                  <button
                    onClick={handleCancel}
                    disabled={actionLoading}
                    className="w-full sm:w-auto px-4 py-2 border border-[#e45e34]/30 text-[#e45e34] hover:bg-[#fef5f2] text-xs font-bold rounded-sm transition flex items-center justify-center space-x-1"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Cancel Request</span>
                  </button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:space-x-2">
                <button
                  onClick={onClose}
                  disabled={actionLoading}
                  className="w-full sm:w-auto px-4 py-2 border border-gray-200 hover:bg-white text-gray-700 text-xs font-semibold rounded-sm transition text-center"
                >
                  Close
                </button>

                {/* Reject Action */}
                {canReject && (
                  <button
                    onClick={() => setRejectMode(true)}
                    disabled={actionLoading}
                    className="w-full sm:w-auto px-4 py-2 bg-[#fef5f2] border border-[#e45e34]/30 text-[#e45e34] hover:bg-[#fef5f2]/80 text-xs font-bold rounded-sm transition text-center"
                  >
                    Reject
                  </button>
                )}

                {/* Dispatch Action */}
                {canDispatch && (
                  <button
                    onClick={handleDispatch}
                    disabled={actionLoading}
                    className="w-full sm:w-auto px-5 py-2 bg-[#7e2562] hover:bg-[#681b50] text-white text-xs font-bold rounded-sm shadow-xs flex items-center justify-center space-x-1.5 transition"
                  >
                    {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clipboard className="w-3.5 h-3.5" />}
                    <span>Dispatch Stock to {transfer.toBranch?.name}</span>
                  </button>
                )}

                {/* Receive Action */}
                {canReceive && (
                  <button
                    onClick={handleReceive}
                    disabled={actionLoading}
                    className="w-full sm:w-auto px-5 py-2 bg-[#3cb976] hover:bg-[#34a266] text-white text-xs font-bold rounded-sm shadow-xs flex items-center justify-center space-x-1.5 transition cursor-pointer"
                  >
                    {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span>
                      {transfer.items?.reduce((s: number, i: any) => s + (receiveQuantities[i.bookId] ?? Number(i.quantityDispatched || 0)), 0) < transfer.items?.reduce((s: number, i: any) => s + Number(i.quantityDispatched || 0), 0)
                        ? `Confirm Partial Receipt (${transfer.items?.reduce((s: number, i: any) => s + (receiveQuantities[i.bookId] ?? Number(i.quantityDispatched || 0)), 0)}/${transfer.items?.reduce((s: number, i: any) => s + Number(i.quantityDispatched || 0), 0)} copies)`
                        : 'Confirm Receipt into Inventory'}
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
