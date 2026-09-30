"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useExhibitionWorkspace } from '../ExhibitionContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, Loader2, CheckCircle2, RefreshCw, AlertTriangle, ShieldCheck, 
  ArchiveRestore, XCircle, CheckCircle, AlertCircle, FileText
} from 'lucide-react';
import { api } from '@/lib/api';

export default function ExhibitionDayClosePage() {
  const router = useRouter();
  const { exitExhibitionMode } = useAuth();
  const { metrics, exhibition, data, exhibitionId, fetchWorkspaceData } = useExhibitionWorkspace();

  const [countedCash, setCountedCash] = useState('');
  const [dayCloseNote, setDayCloseNote] = useState('');
  const [submittingClose, setSubmittingClose] = useState(false);

  // Modal States
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showReconcileModal, setShowReconcileModal] = useState(false);
  const [reconciliation, setReconciliation] = useState<any[]>([]);
  const [closeNote, setCloseNote] = useState('');

  const systemCash = Number(metrics?.cashTotal || 0);
  const userCash = countedCash === '' ? null : Number(countedCash);
  const variance = userCash === null ? null : userCash - systemCash;

  // Initial form submit -> opens confirmation modal
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (countedCash === '') return;
    setShowConfirmModal(true);
  };

  // Proceed from Confirmation -> Open Reconcile Modal pre-populated with live exhibition stock
  const handleProceedToReconcile = () => {
    setShowConfirmModal(false);

    const stockList = (exhibition?.stock && exhibition.stock.length > 0)
      ? exhibition.stock
      : (data?.eventToDate?.sellThroughList || []);

    const initialRec = stockList.map((s: any) => {
      const sold = Number(s.quantitySold || 0);
      const credit = Number(s.quantityCredit || 0);
      const totalTaken = Number(s.quantityTaken || 0) + Number(s.quantityTopUp || 0);
      const damagedLost = Number(s.quantityDamaged || 0) + Number(s.quantityLost || 0);
      const returned = Math.max(0, totalTaken - sold - credit - damagedLost);
      return {
        stockId: s.id || s.bookId || s.book?.id,
        title: s.book?.title || 'Unknown Title',
        quantityTaken: totalTaken,
        quantitySold: sold,
        quantityCredit: credit,
        quantityDamagedLost: damagedLost,
        quantityReturned: returned
      };
    });

    setReconciliation(initialRec);
    setShowReconcileModal(true);
  };

  // Final submit -> calls Day Close API + Event Close Reconciliation API + terminates exhibition workspace
  const handleFinalReconcileAndClose = async () => {
    // Validate balance for every title: Sold + Returned + Damaged/Lost + Credit == Taken
    for (const rec of reconciliation) {
      const total = (rec.quantitySold || 0) + (rec.quantityReturned || 0) + (rec.quantityDamagedLost || 0) + (rec.quantityCredit || 0);
      if (total !== rec.quantityTaken) {
        alert(`Count Mismatch in "${rec.title}": Total accounted (${total}) does not equal quantity taken (${rec.quantityTaken}).`);
        return;
      }
    }

    try {
      setSubmittingClose(true);

      // 1. Submit Day Close Cash Declaration
      await api.post(`/exhibitions/${exhibitionId}/day-close`, {
        closeDate: new Date().toISOString().split('T')[0],
        countedCash: Number(countedCash) || 0,
        note: dayCloseNote.trim() || undefined
      });

      // 2. Submit Final Event Close & Stock Reconciliation
      await api.post(`/exhibitions/${exhibitionId}/close`, {
        note: closeNote.trim() || dayCloseNote.trim() || undefined,
        items: reconciliation.map(r => ({
          stockId: r.stockId,
          quantitySold: r.quantitySold || 0,
          quantityReturned: r.quantityReturned || 0,
          quantityDamaged: r.quantityDamagedLost || 0,
          quantityLost: 0,
          quantityCredit: r.quantityCredit || 0
        }))
      });

      setShowReconcileModal(false);
      exitExhibitionMode();
      router.push('/dashboard/exhibitions');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to complete exhibition day close and reconciliation.');
    } finally {
      setSubmittingClose(false);
    }
  };

  return (
    <div className="space-y-6  mx-auto">
      {/* Header Banner */}
      <div className="bg-[#7e2562] text-white p-5 rounded-xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/10 rounded-lg">
            <Clock className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-pink-100 font-mono">Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            </div>
            <h1 className="text-xl font-black text-white mt-0.5">End of Day Close & Event Reconciliation</h1>
          </div>
        </div>

        <button
          onClick={fetchWorkspaceData}
          className="px-4 py-2 text-xs font-bold bg-white/10 hover:bg-white/20 text-white rounded-lg transition flex items-center gap-1.5 self-start md:self-auto cursor-pointer border border-white/20"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Cash Totals
        </button>
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#7e2562]/10 rounded-xl p-4 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Today's System Cash Total</span>
          <span className="text-2xl font-black text-[#7e2562] mt-1 font-mono block">
            ₹{systemCash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-slate-400">Sum of cash transactions billed</span>
        </div>

        <div className="bg-white border border-[#7e2562]/10 rounded-xl p-4 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Today's UPI Total</span>
          <span className="text-2xl font-black text-indigo-600 mt-1 font-mono block">
            ₹{Number(metrics?.upiTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-slate-400">Digital UPI payments</span>
        </div>

        <div className="bg-white border border-[#7e2562]/10 rounded-xl p-4 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total Billed Sales</span>
          <span className="text-2xl font-black text-emerald-600 mt-1 font-mono block">
            ₹{Number(metrics?.totalRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-slate-400">Cash + UPI grand total</span>
        </div>
      </div>

      {/* Cash Drawer Declaration Form */}
      <div className="bg-white border border-[#7e2562]/10 rounded-xl p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b pb-3">
          <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#7e2562]" /> Physical Cash Drawer Declaration
          </h2>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block">System Billed Cash Target (₹)</label>
            <input 
              type="text" 
              readOnly 
              value={`₹${systemCash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
              className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono font-black text-slate-700 mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block">
              Actual Physical Cash Counted in Drawer (₹)
            </label>
            <input 
              type="number" 
              required
              min="0"
              step="any"
              value={countedCash}
              onChange={e => setCountedCash(e.target.value)}
              placeholder="Enter counted physical cash amount"
              className="w-full text-base p-3 border border-slate-300 rounded-xl mt-1 font-mono font-black focus:ring-2 focus:ring-[#7e2562]"
            />
          </div>

          {/* Live Discrepancy Indicator */}
          {variance !== null && (
            <div className={`p-4 rounded-xl border flex items-center justify-between ${
              variance === 0
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : variance > 0
                  ? 'bg-blue-50 border-blue-200 text-blue-900'
                  : 'bg-red-50 border-red-200 text-red-900'
            }`}>
              <div className="flex items-center gap-2">
                <AlertTriangle className={`w-5 h-5 ${variance < 0 ? 'text-red-500' : 'text-emerald-500'}`} />
                <div>
                  <span className="text-xs font-bold block">Cash Variance Calculation</span>
                  <span className="text-[11px]">
                    {variance === 0 
                      ? 'Exact Match! Physical cash matches system total perfectly.' 
                      : variance > 0 
                        ? `Surplus Cash: ₹${variance} extra cash counted in drawer.` 
                        : `Shortage Discrepancy: ₹${Math.abs(variance)} missing cash.`}
                  </span>
                </div>
              </div>
              <span className="text-lg font-black font-mono">
                {variance > 0 ? `+₹${variance}` : `₹${variance}`}
              </span>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-700 block">EOD Observations & Reconciliation Notes</label>
            <textarea 
              value={dayCloseNote}
              onChange={e => setDayCloseNote(e.target.value)}
              placeholder="Record any note regarding cash breakdown, float amount, or variance reasons..."
              className="w-full text-xs p-3 border border-slate-200 rounded-xl mt-1 h-20"
            />
          </div>

          <button 
            type="submit"
            disabled={submittingClose || countedCash === ''}
            className="w-full py-4 text-xs font-black uppercase tracking-wider text-white bg-[#7e2562] hover:bg-[#671e50] rounded-xl shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            Submit End of Day Cash Close & End Exhibition
          </button>
        </form>
      </div>

      {/* 1. Step 1: Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 border border-[#7e2562]/20 space-y-5"
            >
              <div className="flex items-center gap-3 border-b pb-4">
                <div className="p-3 bg-[#faedf5] text-[#7e2562] rounded-xl">
                  <AlertTriangle className="w-6 h-6 text-[#7e2562]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Confirm Event Close & Reconciliation</h3>
                  <p className="text-xs text-slate-500">Are you sure you want to end this exhibition event?</p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">System Cash Target:</span>
                  <span className="font-mono font-bold text-slate-900">₹{systemCash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Counted Physical Cash:</span>
                  <span className="font-mono font-bold text-[#7e2562]">₹{Number(countedCash || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-slate-500">Discrepancy / Variance:</span>
                  <span className={`font-mono font-bold ${(variance || 0) < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                    {(variance || 0) >= 0 ? `+₹${variance || 0}` : `₹${variance || 0}`}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Proceeding will launch final event stock reconciliation to confirm units sold, credit copies, damaged items, and returned inventory before closing this workspace.
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleProceedToReconcile}
                  className="px-5 py-2.5 text-xs font-black uppercase text-white bg-[#7e2562] hover:bg-[#671e50] rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
                >
                  Proceed to Reconcile & Close <ArchiveRestore className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Step 2: Final Event Reconcile & Close Modal */}
      <AnimatePresence>
        {showReconcileModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92dvh] flex flex-col overflow-hidden border border-[#7e2562]/20"
            >
              <div className="p-5 border-b border-slate-200 shrink-0 bg-slate-50">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-[#7e2562] shrink-0"/> Reconcile & Close Event — {exhibition?.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Verify sold, credit, damaged/lost, and returned book quantities. Accounted totals must equal total taken.
                    </p>
                  </div>
                  <button 
                    onClick={() => setShowReconcileModal(false)} 
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div className="p-5 flex-1 overflow-y-auto space-y-4">
                <div className="border border-[#7e2562]/10 rounded-xl overflow-x-auto shadow-xs">
                  <table className="min-w-[640px] w-full divide-y divide-gray-200">
                    <thead className="bg-[#faedf5]/70 sticky top-0 z-10 text-[11px] font-bold text-[#7e2562] uppercase tracking-wider border-b border-[#7e2562]/10 whitespace-nowrap">
                      <tr>
                        <th className="px-4 py-3 text-left">Book Title</th>
                        <th className="px-3 py-3 text-center">Taken</th>
                        <th className="px-3 py-3 text-center text-[#3cb976]">Sold</th>
                        <th className="px-3 py-3 text-center text-[#7e2562]">Not Sold</th>
                        <th className="px-3 py-3 text-center text-[#e45e34]">Damaged / Lost</th>
                        <th className="px-3 py-3 text-center text-purple-700">Credit</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 text-xs">
                      {reconciliation.map((rec: any, idx: number) => {
                        const total = (rec.quantitySold || 0) + (rec.quantityReturned || 0) + (rec.quantityDamagedLost || 0) + (rec.quantityCredit || 0);
                        const isBalanced = total === rec.quantityTaken;

                        const updateRow = (fields: Partial<typeof rec>) => {
                          const newRec = [...reconciliation];
                          const updated = { ...newRec[idx], ...fields };
                          const s = Number(updated.quantitySold) || 0;
                          const c = Number(updated.quantityCredit) || 0;
                          const dl = Number(updated.quantityDamagedLost) || 0;
                          updated.quantityReturned = Math.max(0, updated.quantityTaken - s - c - dl);
                          newRec[idx] = updated;
                          setReconciliation(newRec);
                        };

                        return (
                          <tr key={rec.stockId} className={!isBalanced ? 'bg-rose-50/70' : ''}>
                            <td className="px-4 py-3 font-semibold text-slate-900 max-w-[200px] truncate" title={rec.title}>
                              {rec.title}
                              {!isBalanced && <div className="text-[10px] text-red-600 font-bold mt-1">Count mismatch: {total} vs {rec.quantityTaken}</div>}
                            </td>
                            <td className="px-3 py-3 text-center font-bold text-slate-700">{rec.quantityTaken}</td>
                            <td className="px-3 py-3 text-center font-bold text-emerald-700 bg-emerald-50/50">
                              {rec.quantitySold}
                            </td>
                            <td className="px-3 py-3 text-center font-bold text-[#7e2562] bg-[#faedf5]/40">
                              {rec.quantityReturned}
                            </td>
                            <td className="px-2 py-2">
                              <input 
                                type="number" 
                                min="0" 
                                max={Math.max(0, rec.quantityTaken - rec.quantitySold - rec.quantityCredit)}
                                value={rec.quantityDamagedLost} 
                                onChange={(e) => updateRow({ quantityDamagedLost: Math.max(0, Number(e.target.value)) })} 
                                className="w-full px-2 py-1 text-xs font-bold text-rose-600 border border-rose-300 rounded-lg text-center focus:ring-2 focus:ring-rose-500 bg-white" 
                              />
                            </td>
                            <td className="px-3 py-3 text-center font-bold text-purple-700 bg-purple-50/50">
                              {rec.quantityCredit}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Final Closing Notes</label>
                  <textarea 
                    value={closeNote}
                    onChange={(e) => setCloseNote(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-3 text-xs focus:ring-1 focus:ring-[#7e2562]"
                    rows={2}
                    placeholder="Any final remarks regarding event reconciliation or stock return..."
                  />
                </div>
              </div>

              <div className="p-4 sm:px-6 border-t border-slate-200 bg-slate-50 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:space-x-3 shrink-0">
                <button 
                  type="button"
                  onClick={() => setShowReconcileModal(false)} 
                  disabled={submittingClose} 
                  className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={handleFinalReconcileAndClose}
                  disabled={submittingClose}
                  className="w-full sm:w-auto px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white bg-[#7e2562] hover:bg-[#671e50] rounded-xl disabled:opacity-50 transition flex items-center justify-center gap-2 shadow-md cursor-pointer"
                >
                  {submittingClose ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Submit Final Event Reconciliation & Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
