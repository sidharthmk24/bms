"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { X, Check, ArrowRight, Loader2, Ban, RefreshCw, Clipboard, FileText, CheckCircle2, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TransferDetailsModalProps {
  transferId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedTransfer?: any) => void;
}

export default function TransferDetailsModal({ transferId, isOpen, onClose, onSuccess }: TransferDetailsModalProps) {
  const { user } = useAuth();
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
    if (!confirm('Are you sure you want to cancel this transfer request?')) return;
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
  // Dispatch: Source location dispatches (Central Inventory / Admin if from Warehouse, or Source Branch Manager if from Store)
  const canDispatch = transfer?.status === 'PENDING' && (
    (isFromWarehouse && (isCentralInventory || isAdmin || isSuperAdmin || isSourceBranchUser)) ||
    (!isFromWarehouse && (isSourceBranchUser || isAdmin || isSuperAdmin))
  );

  // Confirm Receipt: ONLY the Destination branch confirms receipt!
  // - If destination is Warehouse: Central Inventory Manager, Admin, Super Admin
  // - If destination is Retail Store: ONLY the Destination Branch Manager / Staff at that branch (or Super Admin override)
  const canReceive = transfer?.status === 'DISPATCHED' && (
    (isToWarehouse && (isCentralInventory || isAdmin || isSuperAdmin || isDestBranchUser)) ||
    (!isToWarehouse && (isDestBranchUser || isSuperAdmin))
  );

  // Reject: Source location can reject pending request
  const canReject = transfer?.status === 'PENDING' && (
    (isFromWarehouse && (isCentralInventory || isAdmin || isSuperAdmin)) ||
    isSourceBranchUser
  );

  // Cancel: Destination branch requester can cancel their own pending request
  const canCancel = transfer?.status === 'PENDING' && (
    isDestBranchUser ||
    (isToWarehouse && isCentralInventory) ||
    isSuperAdmin
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-amber-50 border-amber-200 text-amber-700';
      case 'DISPATCHED':
        return 'bg-sky-50 border-sky-200 text-sky-700 animate-pulse';
      case 'RECEIVED':
        return 'bg-emerald-50 border-emerald-200 text-emerald-700';
      case 'REJECTED':
        return 'bg-rose-50 border-rose-200 text-rose-700';
      case 'CANCELLED':
        return 'bg-slate-100 border-slate-200 text-slate-600';
      default:
        return 'bg-slate-50 border-slate-200 text-slate-700';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200/60 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
                <span>Transfer Details</span>
                {transfer && (
                  <span className={`px-2 py-0.5 border text-xs font-semibold rounded-full ${getStatusBadge(transfer.status)}`}>
                    {transfer.status}
                  </span>
                )}
              </h3>
              {transfer && <p className="text-xs font-mono text-slate-500 mt-0.5">{transfer.transferNumber}</p>}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 flex-1 overflow-y-auto min-h-0 space-y-6">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <span className="text-sm">Loading details...</span>
              </div>
            ) : error ? (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-sm font-semibold flex items-center space-x-2">
                <X className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{error}</span>
              </div>
            ) : transfer ? (
              <div className="space-y-6">
                {/* Branch route mapping */}
                <div className="p-4 bg-slate-50/70 border border-slate-200/40 rounded-xl flex items-center justify-between">
                  <div className="flex-1 text-center pr-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Source (From)</p>
                    <p className="text-sm font-bold text-slate-700 mt-0.5 truncate">{transfer.fromBranch.name}</p>
                    <span className="text-xs text-slate-400 font-mono">({transfer.fromBranch.code})</span>
                  </div>
                  
                  <div className="p-1.5 bg-blue-50 border border-blue-100 rounded-full">
                    <ArrowRight className="w-4 h-4 text-blue-500" />
                  </div>

                  <div className="flex-1 text-center pl-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Destination (To)</p>
                    <p className="text-sm font-bold text-slate-700 mt-0.5 truncate">{transfer.toBranch.name}</p>
                    <span className="text-xs text-slate-400 font-mono">({transfer.toBranch.code})</span>
                  </div>
                </div>

                {/* Transfer metadata */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">Requested By</span>
                    <span className="font-semibold text-slate-700 mt-0.5 block">{transfer.requestedBy?.name || 'BMS Staff'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">Requested Date</span>
                    <span className="font-semibold text-slate-700 mt-0.5 block">
                      {new Date(transfer.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                    </span>
                  </div>
                </div>

                {transfer.note && (
                  <div className="p-3 bg-slate-50 border border-slate-200/50 rounded-xl flex items-start space-x-2 text-slate-600 text-xs leading-relaxed">
                    <FileText className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-500 block mb-0.5">Notes</span>
                      {transfer.note}
                    </div>
                  </div>
                )}

                {/* Items */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Transfer Books</label>
                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                    <div className="px-4 py-2 bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider grid grid-cols-12 gap-2">
                      <div className="col-span-8">Book details</div>
                      <div className="col-span-4 text-right">Qty (Req / Disp / Recv)</div>
                    </div>
                    {transfer.items.map((item: any) => (
                      <div key={item.id} className="px-4 py-3 text-sm grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-8 min-w-0">
                          <p className="font-semibold text-slate-700 truncate">{item.book.title}</p>
                          <p className="text-xs text-slate-400 font-mono mt-0.5">{item.book.isbn}</p>
                        </div>
                        <div className="col-span-4 text-right font-mono font-semibold text-slate-600">
                          {item.quantityRequested} / {item.quantityDispatched} / {item.quantityReceived}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rejection input field */}
                {rejectMode && (
                  <div className="space-y-2 p-4 bg-rose-50 border border-rose-100 rounded-xl">
                    <label className="text-xs font-bold text-rose-700 block">Rejection Reason</label>
                    <input
                      type="text"
                      placeholder="Why is this transfer being rejected?"
                      value={rejectionNote}
                      onChange={(e) => setRejectionNote(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-rose-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                    />
                    <div className="flex justify-end space-x-2 mt-2">
                      <button
                        onClick={() => setRejectMode(false)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-white rounded border border-slate-200"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleReject}
                        disabled={!rejectionNote.trim() || actionLoading}
                        className="px-3 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded shadow-sm disabled:opacity-50"
                      >
                        Confirm Reject
                      </button>
                    </div>
                  </div>
                )}

                {/* Awaiting Receipt Notice for non-destination users */}
                {transfer.status === 'DISPATCHED' && !canReceive && (
                  <div className="p-3.5 bg-sky-50 border border-sky-200/80 rounded-xl text-xs text-sky-800 flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-sky-600 shrink-0" />
                    <div>
                      <p className="font-bold text-sky-900">In Transit — Awaiting Destination Receipt</p>
                      <p className="text-sky-700 mt-0.5">
                        Stock has been dispatched. Physical receipt and stock confirmation must be confirmed by the destination branch manager at <strong>{transfer.toBranch?.name}</strong>.
                      </p>
                    </div>
                  </div>
                )}

                {/* Awaiting Dispatch Notice for non-source users */}
                {transfer.status === 'PENDING' && !canDispatch && (
                  <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-xl text-xs text-amber-800 flex items-center gap-2.5">
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
            <div className="px-6 py-4 border-t border-slate-200/60 bg-slate-50/50 flex justify-between space-x-3 items-center">
              {/* Cancel Request Action */}
              <div>
                {canCancel && (
                  <button
                    onClick={handleCancel}
                    disabled={actionLoading}
                    className="px-4 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 text-sm font-semibold rounded-xl transition flex items-center space-x-1"
                  >
                    <Ban className="w-4 h-4" />
                    <span>Cancel Request</span>
                  </button>
                )}
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={onClose}
                  disabled={actionLoading}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 text-sm font-semibold rounded-xl transition"
                >
                  Close
                </button>

                {/* Reject Action */}
                {canReject && (
                  <button
                    onClick={() => setRejectMode(true)}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 text-sm font-semibold rounded-xl transition"
                  >
                    Reject
                  </button>
                )}

                {/* Dispatch Action */}
                {canDispatch && (
                  <button
                    onClick={handleDispatch}
                    disabled={actionLoading}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-500/10 flex items-center space-x-2 transition"
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clipboard className="w-4 h-4" />}
                    <span>Dispatch Stock</span>
                  </button>
                )}

                {/* Receive Action */}
                {canReceive && (
                  <button
                    onClick={handleReceive}
                    disabled={actionLoading}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-emerald-500/10 flex items-center space-x-2 transition"
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
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
