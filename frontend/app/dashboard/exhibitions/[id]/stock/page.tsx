"use client";

import React, { useState } from 'react';
import { useExhibitionWorkspace } from '../ExhibitionContext';
import { BookOpen, Search, Download, RefreshCw, AlertTriangle, Layers, Boxes } from 'lucide-react';

export default function ExhibitionStockPage() {
  const { exhibition, data, metrics, fetchWorkspaceData } = useExhibitionWorkspace();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'AVAILABLE' | 'LOW' | 'OUT'>('ALL');

  const isDispatched = ['DISPATCHED', 'ONGOING', 'CLOSED', 'OVERDUE'].includes(exhibition?.status || '');

  const rawStock = isDispatched 
    ? ((exhibition?.stock && exhibition.stock.length > 0)
        ? exhibition.stock
        : (data?.eventToDate?.sellThroughList || []))
    : [];

  const stockItems = rawStock.map((s: any) => {
    const avail = s.quantityRemaining !== undefined
      ? s.quantityRemaining
      : (s.quantityTaken || 0) + (s.quantityTopUp || 0) - (s.quantitySold || 0) - (s.quantityReturned || 0);

    return {
      id: s.id || s.bookId,
      bookId: s.bookId || s.book?.id,
      book: s.book,
      quantityTaken: s.quantityTaken ?? s.taken ?? 0,
      quantityTopUp: s.quantityTopUp ?? s.topUp ?? 0,
      quantitySold: s.quantitySold ?? s.sold ?? 0,
      availableQty: Math.max(0, avail)
    };
  });

  const filteredItems = stockItems.filter((item: any) => {
    // Filter mode
    if (filterMode === 'AVAILABLE' && item.availableQty <= 0) return false;
    if (filterMode === 'LOW' && (item.availableQty <= 0 || item.availableQty > 5)) return false;
    if (filterMode === 'OUT' && item.availableQty > 0) return false;

    // Search query
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (item.book?.title || '').toLowerCase().includes(q) ||
      (item.book?.isbn || '').toLowerCase().includes(q) ||
      (item.book?.author?.name || item.book?.authorName || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Stock Management Header */}
      <div className="bg-slate-900 text-white p-5 rounded-xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-600 rounded-lg">
            <Boxes className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
            
              <span className="text-xs text-slate-400 font-mono">Total Titles: {exhibition?.stock?.length || 0}</span>
            </div>
            <h1 className="text-xl font-black text-white mt-0.5">Venue Book Stock & Inventory</h1>
          </div>
        </div>

        <button
          onClick={fetchWorkspaceData}
          className="px-4 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg transition flex items-center gap-1.5 self-start md:self-auto cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Inventory
        </button>
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Copies Dispatched</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">{metrics?.totalDispatched || 0}</span>
          <span className="text-[10px] text-slate-400">Includes mid-event top-ups</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Copies Sold</span>
          <span className="text-2xl font-black text-emerald-600 mt-1 block">{metrics?.totalSold || 0}</span>
          <span className="text-[10px] text-slate-400">Live venue POS sales</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Available Copies</span>
          <span className="text-2xl font-black text-indigo-600 mt-1 block">{metrics?.totalRemaining || 0}</span>
          <span className="text-[10px] text-slate-400">Ready for instant billing</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Low / Out of Stock</span>
          <span className="text-2xl font-black text-amber-600 mt-1 block">
            {stockItems.filter((i: any) => i.availableQty <= 5).length}
          </span>
          <span className="text-[10px] text-slate-400">Require mid-event top-up</span>
        </div>
      </div>

      {/* Stock Filter & Search Surface */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search stock by book title, author, or ISBN..."
              className="w-full text-xs pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg self-stretch sm:self-auto">
            <button
              onClick={() => setFilterMode('ALL')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${
                filterMode === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({stockItems.length})
            </button>
            <button
              onClick={() => setFilterMode('AVAILABLE')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${
                filterMode === 'AVAILABLE' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              In Stock
            </button>
            <button
              onClick={() => setFilterMode('LOW')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${
                filterMode === 'LOW' ? 'bg-white text-amber-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Low (&le;5)
            </button>
            <button
              onClick={() => setFilterMode('OUT')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${
                filterMode === 'OUT' ? 'bg-white text-red-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Out of Stock
            </button>
          </div>
        </div>

        {/* Stock Inventory Table */}
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100 font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3.5">Book Details</th>
                <th className="p-3.5">ISBN</th>
                <th className="p-3.5">Price</th>
                <th className="p-3.5 text-center">Initial Taken</th>
                <th className="p-3.5 text-center">Top-Up</th>
                <th className="p-3.5 text-center text-emerald-700">Sold</th>
                <th className="p-3.5 text-center text-indigo-700">Available Stock</th>
                <th className="p-3.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 italic">
                    No venue stock items match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredItems.map((s: any) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3.5">
                      <span className="font-bold text-slate-900 block">{s.book?.title}</span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        {s.book?.author?.name || s.book?.authorName || 'Unknown Author'}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-slate-500">{s.book?.isbn || '-'}</td>
                    <td className="p-3.5 font-black text-slate-900">₹{s.book?.price}</td>
                    <td className="p-3.5 text-center font-semibold font-mono">{s.quantityTaken}</td>
                    <td className="p-3.5 text-center font-semibold font-mono text-slate-600">{s.quantityTopUp || 0}</td>
                    <td className="p-3.5 text-center font-bold font-mono text-emerald-700">{s.quantitySold || 0}</td>
                    <td className="p-3.5 text-center font-black font-mono text-indigo-700 text-sm">{s.availableQty}</td>
                    <td className="p-3.5 text-right">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        s.availableQty > 5 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : s.availableQty > 0 
                            ? 'bg-amber-100 text-amber-800' 
                            : 'bg-red-100 text-red-800'
                      }`}>
                        {s.availableQty > 5 ? 'In Stock' : s.availableQty > 0 ? 'Low Stock' : 'Out of Stock'}
                      </span>
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
