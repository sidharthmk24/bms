"use client";

import React, { useState } from 'react';
import { useExhibitionWorkspace } from '../ExhibitionContext';
import { FileText, Loader2, CheckCircle2, RefreshCw, User, Award, HelpCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { Dropdown, DropdownOption } from '@/components/Dropdown';

export default function ExhibitionCreditCopiesPage() {
  const { exhibition, data, exhibitionId, fetchWorkspaceData } = useExhibitionWorkspace();

  const [selectedBookId, setSelectedBookId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [issuedTo, setIssuedTo] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const rawStock = (exhibition?.stock && exhibition.stock.length > 0)
    ? exhibition.stock
    : (data?.eventToDate?.sellThroughList || []);

  const bookOptions: DropdownOption[] = rawStock.map((s: any) => {
    const id = s.bookId || s.book?.id || '';
    const avail = s.quantityRemaining !== undefined
      ? s.quantityRemaining
      : ((s.quantityTaken || 0) + (s.quantityTopUp || 0) - (s.quantitySold || 0) - (s.quantityReturned || 0));
    const title = s.book?.title || 'Unknown Title';
    const isbn = s.book?.isbn || s.book?.code || '';
    return {
      value: id,
      label: title,
      sublabel: `${avail} available in venue`,
      isbn: isbn || undefined,
      disabled: avail <= 0,
      badge: avail <= 0 ? 'Out of Stock' : `${avail} Left`,
      badgeClassName: avail <= 0 ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    };
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookId || quantity <= 0) return;
    setSubmitting(true);
    setSuccessMsg('');
    try {
      const res = await api.post('/billing/checkout', {
        exhibitionId,
        customerName: issuedTo.trim() || 'Credit Copy Recipient',
        paymentStatus: 'PAID',
        paymentMode: 'CASH',
        discount: 0,
        items: [{
          bookId: selectedBookId,
          quantity: Number(quantity),
          unitPrice: 0,
          isCreditCopy: true
        }]
      });
      if (res.success) {
        setSuccessMsg('Credit copy issued successfully!');
        setIssuedTo('');
        setReason('');
        setQuantity(1);
        setSelectedBookId('');
        await fetchWorkspaceData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to issue credit copy.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white p-5 rounded-xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-600 rounded-lg">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
         
              <span className="text-xs text-slate-400 font-mono">Venue: {exhibition?.name}</span>
            </div>
            <h1 className="text-xl font-black text-white mt-0.5">Issue VIP & Free Credit Copies</h1>
          </div>
        </div>

        <button
          onClick={fetchWorkspaceData}
          className="px-4 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg transition flex items-center gap-1.5 self-start md:self-auto cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Issue Form */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b pb-3">
            <Award className="w-4 h-4 text-amber-600" /> New Complimentary / VIP Copy Issuance
          </h2>

          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-lg text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Select Book from Venue Stock</label>
              <Dropdown
                value={selectedBookId}
                onChange={(val) => setSelectedBookId(val)}
                options={bookOptions}
                placeholder="-- Choose Book Title --"
                searchable
                required
                selectClassName="w-full text-xs p-2.5 rounded-lg border-slate-200 font-semibold bg-slate-50 focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block">Quantity</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={quantity}
                  onChange={e => setQuantity(Number(e.target.value))}
                  className="w-full text-xs p-2.5 border rounded-lg mt-1 font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block">Recipient / Organization</label>
                <input
                  type="text"
                  required
                  value={issuedTo}
                  onChange={e => setIssuedTo(e.target.value)}
                  placeholder="VIP Name / Chief Guest / Reviewer"
                  className="w-full text-xs p-2.5 border rounded-lg mt-1"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block">Purpose / Reason</label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Details explaining complimentary or review copy purpose..."
                className="w-full text-xs p-2.5 border rounded-lg mt-1 h-20"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !selectedBookId}
              className="w-full py-3.5 text-xs font-black uppercase tracking-wider text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              Issue Complimentary Copy
            </button>
          </form>
        </div>

        {/* Guidelines */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-600" /> Accounting & Compliance
            </h3>
            <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
              <p>
                <strong>🏷️ ₹0 Invoice Generation:</strong> Issuing credit copies generates a tagged ₹0 invoice entry in the exhibition billing register.
              </p>
              <p>
                <strong>📊 Automatic Inventory Deduction:</strong> Credit copy items immediately decrement from available venue stock.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
