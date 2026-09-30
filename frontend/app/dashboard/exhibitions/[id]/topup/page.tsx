"use client";

import React, { useState, useEffect } from 'react';
import { useExhibitionWorkspace } from '../ExhibitionContext';
import { 
  Send, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Loader2, 
  RefreshCw, 
  Clock, 
  PackageCheck, 
  Truck, 
  AlertCircle, 
  Building2, 
  BookOpen 
} from 'lucide-react';
import { api } from '@/lib/api';
import { Dropdown, DropdownOption } from '@/components/Dropdown';

export default function ExhibitionTopUpPage() {
  const { exhibition, data, exhibitionId, fetchWorkspaceData } = useExhibitionWorkspace();

  const [topUpItems, setTopUpItems] = useState<{ bookId: string; quantity: number }[]>([]);
  const [notes, setNotes] = useState('');
  const [submittingTopup, setSubmittingTopup] = useState(false);
  const [topupSuccess, setTopupSuccess] = useState('');
  
  // Stock requests history
  const [stockRequests, setStockRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [receivingId, setReceivingId] = useState<string | null>(null);

  const rawStock = (exhibition?.stock && exhibition.stock.length > 0)
    ? exhibition.stock
    : (data?.eventToDate?.sellThroughList || []);

  // Prepare options for the smooth Dropdown
  const dropdownOptions: DropdownOption[] = rawStock.map((s: any) => {
    const id = s.bookId || s.book?.id;
    const title = s.book?.title || 'Unknown Title';
    const author = s.book?.author || s.book?.authorName || '';
    const isbn = s.book?.isbn || s.book?.barcode || '';
    const avail = s.quantityRemaining !== undefined ? s.quantityRemaining : ((s.quantityTaken || 0) - (s.quantitySold || 0));

    return {
      value: id,
      label: title,
      sublabel: author ? `By ${author}` : isbn ? `ISBN: ${isbn}` : undefined,
      badge: `In Stock: ${avail}`,
      badgeClassName: avail > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200',
    };
  });

  const fetchStockRequests = async () => {
    if (!exhibitionId) return;
    setLoadingRequests(true);
    try {
      const res = await api.get(`/exhibitions/${exhibitionId}/stock-requests`);
      if (res.success && Array.isArray(res.data)) {
        setStockRequests(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch exhibition stock requests:', err);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    fetchStockRequests();
  }, [exhibitionId]);

  const handleAddTopUpItem = () => {
    if (dropdownOptions.length > 0) {
      const firstBookId = dropdownOptions[0].value;
      setTopUpItems([...topUpItems, { bookId: firstBookId, quantity: 5 }]);
    }
  };

  const handleRemoveTopUpItem = (index: number) => {
    setTopUpItems(topUpItems.filter((_, i) => i !== index));
  };

  const handleTopUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (topUpItems.length === 0) return;
    setSubmittingTopup(true);
    setTopupSuccess('');
    try {
      const res = await api.post(`/exhibitions/${exhibitionId}/stock-requests`, {
        sourceType: 'WAREHOUSE',
        sourceBranchId: null,
        notes: notes.trim() || `Exhibition Restock Request - ${exhibition?.name || 'Live Venue'}`,
        items: topUpItems.map(i => ({
          bookId: i.bookId,
          quantityRequested: i.quantity
        }))
      });

      if (res.success) {
        setTopupSuccess('Mid-Event Restock request submitted to Central Manager successfully!');
        setTopUpItems([]);
        setNotes('');
        await fetchWorkspaceData();
        await fetchStockRequests();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to submit restock request.');
    } finally {
      setSubmittingTopup(false);
    }
  };

  const handleConfirmReceipt = async (requestId: string) => {
    setReceivingId(requestId);
    try {
      const res = await api.post(`/exhibitions/${exhibitionId}/stock-requests/${requestId}/receive`, {});
      if (res.success) {
        await fetchWorkspaceData();
        await fetchStockRequests();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to confirm stock receipt.');
    } finally {
      setReceivingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'APPROVED':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'PARTIALLY_APPROVED':
        return 'bg-indigo-50 text-indigo-800 border-indigo-200';
      case 'DISPATCHED':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'RECEIVED':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'REJECTED':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-[#7e2562] via-[#681b50] to-[#52133e] text-white p-6 rounded-xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-white/15 border border-white/20 rounded-xl shrink-0">
            <Truck className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-pink-200 font-medium">Exhibition: {exhibition?.name || 'Live Venue'}</span>
              <span className="text-pink-300/40">•</span>
              <span className="text-xs text-pink-200">{exhibition?.location || 'Venue Store'}</span>
            </div>
            <h1 className="text-xl font-black text-white leading-tight mt-0.5">Request Mid-Event Restock</h1>
          </div>
        </div>

        <button
          onClick={() => {
            fetchWorkspaceData();
            fetchStockRequests();
          }}
          className="px-4 py-2 text-xs font-bold bg-white/15 hover:bg-white/25 text-white border border-white/20 rounded-lg transition flex items-center gap-1.5 self-start md:self-auto cursor-pointer active:scale-95"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Workspace
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Create Restock Request Form */}
        <div className="lg:col-span-7 bg-white border border-[#7e2562]/10 rounded-xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-[#7e2562]/10 pb-3.5">
            <h2 className="text-sm font-extrabold text-[#7e2562] flex items-center gap-2">
              <Send className="w-4 h-4 text-[#7e2562]" /> New Restock Request
            </h2>
          
          </div>

          {topupSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-lg text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> {topupSuccess}
            </div>
          )}

          <form onSubmit={handleTopUpSubmit} className="space-y-4">
            {/* Requested Book Items */}
            <div className="space-y-3">
              <div className="flex justify-between items-center border-b border-[#7e2562]/10 pb-2">
                <label className="text-xs font-bold text-slate-900">Requested Book Titles & Quantities</label>
                <button
                  type="button"
                  onClick={handleAddTopUpItem}
                  className="text-xs font-bold text-[#7e2562] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Book Title
                </button>
              </div>

              {topUpItems.length === 0 ? (
                <div className="p-8 border border-dashed border-[#7e2562]/20 text-center text-xs text-slate-500 rounded-xl space-y-1.5 bg-[#faf6f9]/50">
                  <BookOpen className="w-8 h-8 text-[#7e2562]/40 mx-auto" />
                  <p className="font-bold text-slate-700">No books added to this restock request yet.</p>
                  <p className="text-slate-500">Click <strong className="text-[#7e2562]">+ Add Book Title</strong> above to select items and quantities required for the exhibition.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {topUpItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-[#faf6f9]/60 p-3 rounded-lg border border-[#7e2562]/15 shadow-xs">
                      {/* Smooth Searchable Dropdown */}
                      <div className="flex-1 min-w-0">
                        <Dropdown
                          value={item.bookId}
                          onChange={(selectedVal) => {
                            const updated = [...topUpItems];
                            updated[idx].bookId = selectedVal;
                            setTopUpItems(updated);
                          }}
                          options={dropdownOptions}
                          placeholder="Select book title..."
                          searchable={true}
                          className="w-full"
                          selectClassName="text-xs py-2 px-3 bg-white border border-[#7e2562]/20 rounded-md font-semibold"
                        />
                      </div>
                      
                      {/* Quantity Input */}
                      <div className="w-28 shrink-0">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={e => {
                            const updated = [...topUpItems];
                            updated[idx].quantity = Math.max(1, Number(e.target.value));
                            setTopUpItems(updated);
                          }}
                          placeholder="Qty"
                          className="w-full text-xs p-2 border border-[#7e2562]/20 rounded-md font-mono font-bold text-center bg-white focus:outline-none focus:border-[#7e2562]"
                        />
                      </div>

                      {/* Remove Row Button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveTopUpItem(idx)}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-md transition cursor-pointer shrink-0"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Note / Justification */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Restock Request Note / Justification</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Optional notes regarding venue demand or urgent stock requirements..."
                className="w-full text-xs p-3 border border-[#7e2562]/20 rounded-lg h-20 focus:outline-none focus:border-[#7e2562] bg-white"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submittingTopup || topUpItems.length === 0}
              className="w-full py-3.5 text-xs font-black uppercase tracking-wider text-white bg-[#7e2562] hover:bg-[#681b50] rounded-xl shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-98"
            >
              {submittingTopup ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Submit Restock Request to Central Manager
            </button>
          </form>
        </div>

        {/* Right Column: Restock Request History & Status */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-[#7e2562]/10 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[#7e2562]/10 pb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#7e2562] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#7e2562]" /> Restock Status & History
              </h3>
              <button 
                onClick={fetchStockRequests}
                className="text-[11px] font-bold text-[#7e2562] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> Refresh Status
              </button>
            </div>

            {loadingRequests ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-[#7e2562]" />
                <p className="text-xs font-medium text-slate-500">Loading restock history...</p>
              </div>
            ) : stockRequests.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 border border-dashed rounded-lg space-y-1">
                <p className="font-semibold text-slate-600">No restock requests yet</p>
                <p className="text-slate-400 text-[11px]">Submitted restock demands will appear here with live dispatch tracking.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {stockRequests.map((req) => {
                  const itemCount = req.items?.length || 0;
                  const totalQty = req.items?.reduce((acc: number, i: any) => acc + (i.quantityRequested || 0), 0) || 0;
                  const isDispatched = req.status === 'DISPATCHED';

                  return (
                    <div key={req.id} className="p-3.5 rounded-lg border border-[#7e2562]/15 bg-[#faf6f9]/40 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-mono font-bold text-slate-500 block">
                            Request #{req.id?.slice(0, 8)}
                          </span>
                          <span className="text-xs font-bold text-slate-800">
                            {itemCount} Title{itemCount > 1 ? 's' : ''} ({totalQty} copies)
                          </span>
                        </div>
                        <span className={`px-2.5 py-0.5 border text-[10px] font-bold rounded-full ${getStatusBadge(req.status)}`}>
                          {req.status}
                        </span>
                      </div>

                      {/* Items Preview */}
                      {req.items && req.items.length > 0 && (
                        <div className="bg-white p-2 rounded border border-slate-100 text-[11px] space-y-1">
                          {req.items.slice(0, 3).map((item: any, i: number) => (
                            <div key={i} className="flex justify-between items-center text-slate-600">
                              <span className="truncate pr-2 font-medium">{item.book?.title || 'Book Title'}</span>
                              <span className="font-mono font-bold text-[#7e2562] shrink-0">x{item.quantityRequested}</span>
                            </div>
                          ))}
                          {req.items.length > 3 && (
                            <p className="text-[10px] text-slate-400 font-semibold text-right">+{req.items.length - 3} more titles</p>
                          )}
                        </div>
                      )}

                      {/* Confirm Receipt Action for Dispatched Requests */}
                      {isDispatched && (
                        <button
                          onClick={() => handleConfirmReceipt(req.id)}
                          disabled={receivingId === req.id}
                          className="w-full py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {receivingId === req.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <PackageCheck className="w-3.5 h-3.5" />
                          )}
                          Confirm Stock Receipt & Update Venue
                        </button>
                      )}

                      <div className="text-[10px] text-slate-400 flex items-center justify-between border-t border-slate-100 pt-1.5">
                        <span>Requested by {req.requestedBy?.name || 'Staff'}</span>
                        <span>{new Date(req.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
