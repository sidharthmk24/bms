"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import { api } from '@/lib/api';
import { X, ArrowRight, Loader2, Ban, Clipboard, FileText, CheckCircle2, Clock } from 'lucide-react';
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

  const fetchTransferDetails = async () => {
    if (!transferId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/transfers/${transferId}`);
      if (response.success && response.data) {
        setTransfer(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch transfer details:', err);
      setError('Failed to load transfer details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && transferId) {
      setRejectMode(false);
      setRejectionNote('');
      fetchTransferDetails();
    }
  }, [isOpen, transferId]);

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

    const ok = await confirm({
      title: "Confirm Stock Receipt",
      message: `Are you sure you want to confirm receipt of books for transfer #${transfer.transferNumber || transfer.id.slice(0, 8)} into this branch's inventory?`,
      confirmText: "Yes, Receive Stock",
      cancelText: "No, Cancel",
      variant: "success",
    });
    if (!ok) return;

    setActionLoading(true);
    setError(null);

    // Instant optimistic update
    const optimistic = {
      ...transfer,
      status: 'RECEIVED',
      items: transfer.items?.map((i: any) => ({
        ...i,
        quantityReceived: i.quantityDispatched || i.quantityRequested
      }))
    };
    setTransfer(optimistic);
    onSuccess(optimistic);

    try {
      const response = await api.post(`/transfers/${transfer.id}/receive`);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-sm shadow-xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] border border-neutral-200/80"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-[#faf6f9]/60">
            <div>
              <h3 className="text-base font-bold text-neutral-900 flex items-center space-x-2">
                <span>Transfer Details</span>
                {transfer && (
                  <span className={`px-2.5 py-0.5 border text-xs font-bold rounded-sm ${getStatusBadge(transfer.status)}`}>
                    {transfer.status}
                  </span>
                )}
              </h3>
              {transfer && <p className="text-xs font-mono text-neutral-500 mt-0.5">{transfer.transferNumber}</p>}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-[#faedf5] rounded-sm transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 flex-1 overflow-y-auto min-h-0 space-y-5">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-3 text-neutral-400 font-medium">
                <Loader2 className="w-8 h-8 animate-spin text-[#7e2562]" />
                <span className="text-xs">Loading details...</span>
              </div>
            ) : error ? (
              <div className="p-4 bg-[#fef5f2] border border-[#e45e34]/20 rounded-sm text-[#e45e34] text-xs font-semibold flex items-center space-x-2">
                <X className="w-4 h-4 text-[#e45e34] shrink-0" />
                <span>{error}</span>
              </div>
            ) : transfer ? (
              <div className="space-y-5">
                {/* Branch route mapping */}
                <div className="p-4 bg-[#faf6f9]/50 border border-[#7e2562]/10 rounded-sm flex items-center justify-between">
                  <div className="flex-1 text-center pr-3">
                    <p className="text-[10px] font-bold text-[#7e2562] uppercase tracking-wider">Source (From)</p>
                    <p className="text-sm font-bold text-neutral-900 mt-0.5 truncate">{transfer.fromBranch.name}</p>
                    <span className="text-xs text-neutral-400 font-mono">({transfer.fromBranch.code})</span>
                  </div>
                  
                  <div className="p-2 bg-[#faedf5] border border-[#7e2562]/20 rounded-sm">
                    <ArrowRight className="w-4 h-4 text-[#7e2562]" />
                  </div>

                  <div className="flex-1 text-center pl-3">
                    <p className="text-[10px] font-bold text-[#7e2562] uppercase tracking-wider">Destination (To)</p>
                    <p className="text-sm font-bold text-neutral-900 mt-0.5 truncate">{transfer.toBranch.name}</p>
                    <span className="text-xs text-neutral-400 font-mono">({transfer.toBranch.code})</span>
                  </div>
                </div>

                {/* Transfer metadata */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-neutral-400 block font-semibold uppercase tracking-wider text-[10px]">Requested By</span>
                    <span className="font-bold text-neutral-900 mt-0.5 block">{transfer.requestedBy?.name || 'BMS Staff'}</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block font-semibold uppercase tracking-wider text-[10px]">Requested Date</span>
                    <span className="font-bold text-neutral-900 mt-0.5 block">
                      {new Date(transfer.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                {transfer.note && (
                  <div className="p-3 bg-[#faf6f9]/40 border border-[#7e2562]/10 rounded-sm flex items-start space-x-2 text-neutral-600 text-xs leading-relaxed">
                    <FileText className="w-4 h-4 text-[#7e2562] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-[#7e2562] block mb-0.5">Notes</span>
                      {transfer.note}
                    </div>
                  </div>
                )}

                {/* Items */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#7e2562] uppercase tracking-wider block">Transfer Books</label>
                  <div className="border border-neutral-200/80 rounded-sm overflow-hidden divide-y divide-neutral-100">
                    <div className="px-4 py-2 bg-[#faf6f9]/70 text-[#7e2562] text-[10px] font-bold uppercase tracking-wider grid grid-cols-12 gap-2 whitespace-nowrap">
                      <div className="col-span-8">Book details</div>
                      <div className="col-span-4 text-right">Qty (Req / Disp / Recv)</div>
                    </div>
                    {transfer.items.map((item: any) => (
                      <div key={item.id} className="px-4 py-3 text-xs grid grid-cols-12 gap-2 items-center hover:bg-[#faf6f9]/30">
                        <div className="col-span-8 min-w-0">
                          <p className="font-bold text-neutral-900 truncate">{item.book.title}</p>
                          <p className="text-[11px] text-neutral-400 font-mono mt-0.5">{item.book.isbn}</p>
                        </div>
                        <div className="col-span-4 text-right font-mono font-bold text-neutral-700">
                          {item.quantityRequested} / {item.quantityDispatched} / {item.quantityReceived}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rejection input field */}
                {rejectMode && (
                  <div className="space-y-2 p-4 bg-[#fef5f2] border border-[#e45e34]/20 rounded-sm">
                    <label className="text-xs font-bold text-[#e45e34] block uppercase tracking-wider">Rejection Reason</label>
                    <input
                      type="text"
                      placeholder="Why is this transfer being rejected?"
                      value={rejectionNote}
                      onChange={(e) => setRejectionNote(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-[#e45e34]/30 rounded-sm focus:outline-none focus:ring-2 focus:ring-[#e45e34]/20 bg-white"
                    />
                    <div className="flex justify-end space-x-2 mt-2">
                      <button
                        onClick={() => setRejectMode(false)}
                        className="px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-white rounded-sm border border-neutral-200"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleReject}
                        disabled={!rejectionNote.trim() || actionLoading}
                        className="px-3 py-1.5 text-xs font-bold bg-[#e45e34] hover:bg-[#d04e26] text-white rounded-sm shadow-sm disabled:opacity-50"
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
                      <p className="font-bold">In Transit — Awaiting Destination Receipt</p>
                      <p className="text-neutral-600 mt-0.5">
                        Stock has been dispatched. Physical receipt and stock confirmation must be confirmed by the destination branch manager at <strong>{transfer.toBranch?.name}</strong>.
                      </p>
                    </div>
                  </div>
                )}

                {/* Awaiting Dispatch Notice for non-source users */}
                {transfer.status === 'PENDING' && !canDispatch && (
                  <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-sm text-xs text-amber-800 flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                      <p className="font-bold text-amber-900">Pending Dispatch</p>
                      <p className="text-amber-700 mt-0.5">
                        Transfer request submitted. Awaiting dispatch confirmation by <strong>{transfer.fromBranch?.name}</strong>.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Footer Actions */}
          {transfer && !rejectMode && (
            <div className="px-6 py-4 border-t border-neutral-200 bg-[#faf6f9]/50 flex justify-between space-x-3 items-center">
              {/* Cancel Request Action */}
              <div>
                {canCancel && (
                  <button
                    onClick={handleCancel}
                    disabled={actionLoading}
                    className="px-4 py-2 border border-[#e45e34]/30 text-[#e45e34] hover:bg-[#fef5f2] text-xs font-bold rounded-sm transition flex items-center space-x-1"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Cancel Request</span>
                  </button>
                )}
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={onClose}
                  disabled={actionLoading}
                  className="px-4 py-2 border border-neutral-200 hover:bg-neutral-50 text-neutral-700 text-xs font-semibold rounded-sm transition"
                >
                  Close
                </button>

                {/* Reject Action */}
                {canReject && (
                  <button
                    onClick={() => setRejectMode(true)}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-[#fef5f2] border border-[#e45e34]/30 text-[#e45e34] hover:bg-[#fef5f2]/80 text-xs font-bold rounded-sm transition"
                  >
                    Reject
                  </button>
                )}

                {/* Dispatch Action */}
                {canDispatch && (
                  <button
                    onClick={handleDispatch}
                    disabled={actionLoading}
                    className="px-5 py-2 bg-[#7e2562] hover:bg-[#681b50] text-white text-xs font-bold rounded-sm shadow-sm flex items-center space-x-1.5 transition"
                  >
                    {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clipboard className="w-3.5 h-3.5" />}
                    <span>Dispatch Stock</span>
                  </button>
                )}

                {/* Receive Action */}
                {canReceive && (
                  <button
                    onClick={handleReceive}
                    disabled={actionLoading}
                    className="px-5 py-2 bg-[#3cb976] hover:bg-[#34a266] text-white text-xs font-bold rounded-sm shadow-sm flex items-center space-x-1.5 transition"
                  >
                    {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span>Confirm Receipt</span>
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
