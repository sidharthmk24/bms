"use client";

import React, { useState } from 'react';
import { useExhibitionWorkspace } from '../ExhibitionContext';
import { generateBillPDF } from '@/lib/pdfUtils';
import { Receipt, Search, Printer, RefreshCw, Calendar, IndianRupee, FileText } from 'lucide-react';

export default function ExhibitionBillsPage() {
  const { exhibition, data, metrics, fetchWorkspaceData } = useExhibitionWorkspace();
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'CASH' | 'UPI'>('ALL');

  const billsList = data?.bills || [];

  const filteredBills = billsList.filter((b: any) => {
    if (paymentFilter !== 'ALL' && b.paymentMethod !== paymentFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (b.billNumber || '').toLowerCase().includes(q) ||
      (b.customerName || '').toLowerCase().includes(q) ||
      (b.customerPhone || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white p-5 rounded-xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-600 rounded-lg">
            <IndianRupee className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
           
              <span className="text-xs text-slate-400 font-mono">Total Bills: {billsList.length}</span>
            </div>
            <h1 className="text-xl font-black text-white mt-0.5">Venue Sales & Invoices</h1>
          </div>
        </div>

        <button
          onClick={fetchWorkspaceData}
          className="px-4 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg transition flex items-center gap-1.5 self-start md:self-auto cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Invoices
        </button>
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total Billed Revenue</span>
          <span className="text-2xl font-black text-emerald-600 mt-1 block">
            ₹{Number(metrics?.totalRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-slate-400">Total revenue generated at venue</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Cash Collections</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">
            ₹{Number(metrics?.cashTotal || 0).toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-slate-400">Physical drawer cash total</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">UPI / GPay Total</span>
          <span className="text-2xl font-black text-indigo-600 mt-1 block">
            ₹{Number(metrics?.upiTotal || 0).toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-slate-400">Digital UPI payments</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total Invoices</span>
          <span className="text-2xl font-black text-[#7e2562] mt-1 block">{billsList.length}</span>
          <span className="text-[10px] text-slate-400">Customer transactions</span>
        </div>
      </div>

      {/* Invoices Surface */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by bill number, customer name or phone..."
              className="w-full text-xs pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg self-stretch sm:self-auto">
            <button
              onClick={() => setPaymentFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${
                paymentFilter === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Payment ({billsList.length})
            </button>
            <button
              onClick={() => setPaymentFilter('CASH')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${
                paymentFilter === 'CASH' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cash Only
            </button>
            <button
              onClick={() => setPaymentFilter('UPI')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${
                paymentFilter === 'UPI' ? 'bg-white text-indigo-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              UPI Only
            </button>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100 font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3.5">Bill Number</th>
                <th className="p-3.5">Customer Name</th>
                <th className="p-3.5">Phone</th>
                <th className="p-3.5">Payment</th>
                <th className="p-3.5 text-center">Items</th>
                <th className="p-3.5 text-right font-black text-emerald-800">Net Amount</th>
                <th className="p-3.5">Date & Time</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 italic">
                    No venue invoices found matching the search criteria.
                  </td>
                </tr>
              ) : (
                filteredBills.map((b: any) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3.5 font-mono font-black text-[#7e2562]">{b.billNumber}</td>
                    <td className="p-3.5 font-bold text-slate-900">{b.customerName || 'Walk-in Customer'}</td>
                    <td className="p-3.5 font-mono text-slate-500">{b.customerPhone || '-'}</td>
                    <td className="p-3.5 uppercase font-bold text-slate-600">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${
                        b.paymentMethod === 'UPI' ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {b.paymentMethod}
                      </span>
                    </td>
                    <td className="p-3.5 text-center font-bold font-mono">{b.items?.length || 0} items</td>
                    <td className="p-3.5 text-right font-black text-emerald-700 font-mono text-sm">₹{b.netAmount}</td>
                    <td className="p-3.5 text-slate-400 font-mono text-[11px]">{new Date(b.createdAt).toLocaleString()}</td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => generateBillPDF(b, b.items || [], { name: exhibition?.name || 'Exhibition Venue' })}
                        className="px-2.5 py-1 text-xs font-bold text-slate-700 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 border border-slate-200 rounded transition inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" /> Receipt
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
