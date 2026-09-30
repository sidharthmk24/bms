"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useExhibitionWorkspace } from './ExhibitionContext';
import { 
  LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer 
} from 'recharts';
import { 
  TrendingUp, AlertTriangle, RefreshCw, ShoppingCart, Boxes, Receipt, 
  Send, FileText, Clock, ChevronDown, ChevronUp, MapPin, Calendar, 
  Sparkles, CheckCircle2, ArrowRight
} from 'lucide-react';

const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-[#7e2562]/20 p-2.5 rounded-lg shadow-lg text-xs space-y-1">
        <p className="font-bold text-gray-900">{label}</p>
        <p className="text-[#7e2562] font-black font-mono">
          Revenue: ₹{Number(payload[0].value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </p>
        {payload[0].payload?.bills > 0 && (
          <p className="text-slate-500 text-[11px] font-mono">Invoices: {payload[0].payload.bills} bills</p>
        )}
      </div>
    );
  }
  return null;
};

export function ExhibitionTopLiveDashboard() {
  const pathname = usePathname();
  const { exhibitionId, exhibition, data, metrics, fetchWorkspaceData } = useExhibitionWorkspace();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('Just now');
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');

  useEffect(() => {
    setLastUpdated(new Date().toLocaleTimeString());
  }, [data]);

  // Compute hourly sales curve in client local timezone matching user real-time system clock
  const chartData = useMemo(() => {
    const hourlyMap: { [hour: number]: { revenue: number; bills: number } } = {};
    
    let startHour = 8;
    let endHour = 22;

    const billsList = Array.isArray(data?.bills) ? data.bills : [];
    const todayStr = new Date().toDateString();

    const getLocalHour = (dateInput: any) => {
      const d = new Date(dateInput);
      const hourStr = d.toLocaleTimeString('en-US', { hour: '2-digit', hour12: false });
      const h = parseInt(hourStr, 10);
      return isNaN(h) ? d.getHours() : (h % 24);
    };

    // 1. Compute directly from bills in client local timezone
    if (billsList.length > 0) {
      billsList.forEach((b: any) => {
        const d = new Date(b.createdAt);
        if (d.toDateString() === todayStr) {
          const h = getLocalHour(d);
          if (h < startHour) startHour = h;
          if (h > endHour) endHour = h;
        }
      });

      for (let h = startHour; h <= endHour; h++) {
        hourlyMap[h] = { revenue: 0, bills: 0 };
      }

      billsList.forEach((b: any) => {
        const d = new Date(b.createdAt);
        if (d.toDateString() === todayStr) {
          const h = getLocalHour(d);
          if (hourlyMap[h] !== undefined) {
            hourlyMap[h].revenue += Number(b.totalAmount || 0);
            hourlyMap[h].bills += 1;
          }
        }
      });
    } else {
      // 2. Fallback to backend curve
      const backendCurve = Array.isArray(data?.today?.hourlySalesCurve) ? data.today.hourlySalesCurve : [];
      backendCurve.forEach((item: any) => {
        const rev = Number(item.revenue || 0);
        if (rev > 0 || item.billsCount > 0) {
          const h = Number(item.hour);
          if (h < startHour) startHour = h;
          if (h > endHour) endHour = h;
        }
      });

      for (let h = startHour; h <= endHour; h++) {
        hourlyMap[h] = { revenue: 0, bills: 0 };
      }

      backendCurve.forEach((item: any) => {
        const h = Number(item.hour);
        if (hourlyMap[h] !== undefined) {
          hourlyMap[h].revenue += Number(item.revenue || 0);
          hourlyMap[h].bills += Number(item.billsCount || 0);
        }
      });
    }

    return Object.keys(hourlyMap)
      .map(Number)
      .sort((a, b) => a - b)
      .map((hour) => {
        const formattedHour = hour === 12 ? '12 PM' : hour === 0 ? '12 AM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
        return {
          hour: formattedHour,
          hourNum: hour,
          revenue: hourlyMap[hour].revenue,
          bills: hourlyMap[hour].bills,
        };
      });
  }, [data]);

  const peakRevenue = useMemo(() => {
    return Math.max(0, ...chartData.map((d: any) => d.revenue));
  }, [chartData]);

  // Restock needed items (Low stock or Out of Stock)
  const rawStock = (exhibition?.stock && exhibition.stock.length > 0)
    ? exhibition.stock
    : (data?.eventToDate?.sellThroughList || []);

  const restockAlertItems = rawStock.filter((s: any) => {
    const avail = s.quantityRemaining !== undefined
      ? s.quantityRemaining
      : (s.quantityTaken || 0) + (s.quantityTopUp || 0) - (s.quantitySold || 0) - (s.quantityReturned || 0);
    return avail <= 5;
  }).map((s: any) => {
    const avail = s.quantityRemaining !== undefined
      ? s.quantityRemaining
      : (s.quantityTaken || 0) + (s.quantityTopUp || 0) - (s.quantitySold || 0) - (s.quantityReturned || 0);
    return {
      bookId: s.bookId || s.book?.id,
      title: s.book?.title || 'Unknown Book',
      isbn: s.book?.isbn || '-',
      availableQty: Math.max(0, avail)
    };
  });

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#7e2562]/15 space-y-4 mb-6 relative overflow-hidden">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-[#7e2562] animate-ping shrink-0" />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-[#faedf5] text-[#7e2562] rounded border border-[#7e2562]/20">
                LIVE EXHIBITION SURFACE
              </span>
              <span className="text-xs font-mono text-slate-500">
                Venue: <strong>{exhibition?.name}</strong> ({exhibition?.location})
              </span>
            </div>
            <h2 className="text-lg font-black text-slate-900 mt-0.5">Live Operations Dashboard</h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[10px] text-slate-400 font-mono hidden md:inline">
            Live Sync • Updated {lastUpdated}
          </span>

          <button
            onClick={() => fetchWorkspaceData()}
            className="p-2 bg-slate-50 hover:bg-[#faedf5] text-slate-700 hover:text-[#7e2562] border border-slate-200 rounded-lg transition cursor-pointer flex items-center gap-1 text-xs font-semibold"
            title="Force refresh live stats"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="px-3 py-1.5 bg-slate-50 hover:bg-[#faedf5] text-slate-700 hover:text-[#7e2562] border border-slate-200 rounded-lg transition text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            {isCollapsed ? (
              <>
                <ChevronDown className="w-4 h-4" /> Expand Dashboard
              </>
            ) : (
              <>
                <ChevronUp className="w-4 h-4" /> Collapse
              </>
            )}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="space-y-6 relative z-10 animate-in fade-in duration-200">
          {/* Top Metrics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Live Sales Revenue</span>
              <span className="text-2xl font-black text-[#7e2562] font-mono block">
                ₹{Number(metrics?.totalRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-slate-400 block font-mono">
                Cash: ₹{metrics?.cashTotal || 0} | UPI: ₹{metrics?.upiTotal || 0}
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Copies Sold Today</span>
              <span className="text-2xl font-black text-slate-900 font-mono block">
                {metrics?.totalSold || 0}
              </span>
              <span className="text-[10px] text-slate-400 block font-mono">
                Today's Invoices: {data?.today?.billCount || 0} bills
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Available Venue Stock</span>
              <span className="text-2xl font-black text-[#7e2562] font-mono block">
                {metrics?.totalRemaining || 0}
              </span>
              <span className="text-[10px] text-slate-400 block font-mono">
                Dispatched: {metrics?.totalDispatched || 0} copies
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Restock Needed Alerts</span>
              <span className="text-2xl font-black text-amber-600 font-mono block">
                {restockAlertItems.length}
              </span>
              <span className="text-[10px] text-slate-400 block">
                Titles with &le; 5 copies left
              </span>
            </div>
          </div>

          {/* Graph & Restock Needed Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Live Hourly Sales Trend Graph */}
            <div className="lg:col-span-7 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-2 gap-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#7e2562]" />
                  <h3 className="text-xs font-bold text-slate-900 tracking-wider">
                    Today's Live Sales Trend (Revenue in ₹)
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center space-x-1 bg-[#faedf5] p-0.5 rounded-lg border border-[#7e2562]/10">
                    <button
                      type="button"
                      onClick={() => setChartType('line')}
                      className={`px-2 py-0.5 text-[10px] font-semibold rounded-md transition-all cursor-pointer ${
                        chartType === 'line'
                          ? 'bg-[#7e2562] text-white shadow-xs'
                          : 'text-gray-600 hover:text-[#7e2562]'
                      }`}
                    >
                      Line
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartType('bar')}
                      className={`px-2 py-0.5 text-[10px] font-semibold rounded-md transition-all cursor-pointer ${
                        chartType === 'bar'
                          ? 'bg-[#7e2562] text-white shadow-xs'
                          : 'text-gray-600 hover:text-[#7e2562]'
                      }`}
                    >
                      Bar
                    </button>
                  </div>

                  <span className="text-[10px] font-mono text-[#7e2562] font-bold">
                    Peak: ₹{peakRevenue.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="h-48 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'line' ? (
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3e8f0" />
                      <XAxis dataKey="hour" axisLine={false} tickLine={false} stroke="#9ca3af" fontSize={10} />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        stroke="#9ca3af" 
                        fontSize={10} 
                        tickFormatter={(v) => `₹${v}`} 
                        domain={[0, peakRevenue > 0 ? 'auto' : 500]}
                      />
                      <RechartsTooltip content={<CustomChartTooltip />} cursor={{ stroke: '#7e2562', strokeWidth: 1.5, strokeDasharray: '3 3' }} />
                      <ReferenceLine y={0} stroke="#f3e8f0" />
                      <Line 
                        type="monotone" 
                        dataKey="revenue" 
                        name="Revenue" 
                        stroke="#7e2562" 
                        strokeWidth={2.5} 
                        dot={false}
                        activeDot={{ r: 5, fill: '#7e2562', stroke: '#fff', strokeWidth: 2 }} 
                      />
                    </LineChart>
                  ) : (
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3e8f0" />
                      <XAxis dataKey="hour" axisLine={false} tickLine={false} stroke="#9ca3af" fontSize={10} />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        stroke="#9ca3af" 
                        fontSize={10} 
                        tickFormatter={(v) => `₹${v}`} 
                        domain={[0, peakRevenue > 0 ? 'auto' : 500]}
                      />
                      <RechartsTooltip content={<CustomChartTooltip />} cursor={{ fill: '#faedf5', opacity: 0.6 }} />
                      <Bar dataKey="revenue" name="Revenue" fill="#7e2562" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>

            {/* Restock Needed Books Alert Box */}
            <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h3 className="text-xs font-black uppercase text-amber-600 tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-500" /> Restock Needed ({restockAlertItems.length})
                  </h3>

                  <Link
                    href={`/dashboard/exhibitions/${exhibitionId}/topup`}
                    className="text-[10px] font-bold text-[#7e2562] hover:text-[#671e50] flex items-center gap-1"
                  >
                    Request Top-Up <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>

                {restockAlertItems.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 italic">
                    All venue titles have healthy stock levels (&gt; 5 copies).
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                    {restockAlertItems.slice(0, 10).map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200 text-xs">
                        <div className="min-w-0 flex-1 pr-2">
                          <span className="font-bold text-slate-900 block truncate">{item.title}</span>
                          <span className="text-[10px] text-slate-500 font-mono">ISBN: {item.isbn}</span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            item.availableQty === 0 ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {item.availableQty === 0 ? 'Out of Stock' : `${item.availableQty} Left`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {restockAlertItems.length > 0 && (
                <Link
                  href={`/dashboard/exhibitions/${exhibitionId}/topup`}
                  className="w-full py-2 text-xs font-bold text-center text-white bg-[#7e2562] hover:bg-[#671e50] rounded-lg transition block"
                >
                  ⚡ Launch Mid-Event Top-Up Request
                </Link>
              )}
            </div>
          </div>

          {/* Quick Sub-Route Navigation Shortcuts */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-2 border-t border-slate-200">
            <Link
              href={`/dashboard/exhibitions/${exhibitionId}/live-billing`}
              className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                pathname.endsWith('/live-billing')
                  ? 'bg-[#7e2562] text-white border-[#7e2562] shadow-md'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-[#faedf5] hover:text-[#7e2562]'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" /> Live POS Billing
            </Link>

            <Link
              href={`/dashboard/exhibitions/${exhibitionId}/stock`}
              className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                pathname.endsWith('/stock')
                  ? 'bg-[#7e2562] text-white border-[#7e2562] shadow-md'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-[#faedf5] hover:text-[#7e2562]'
              }`}
            >
              <Boxes className="w-3.5 h-3.5" /> Venue Book Stock
            </Link>

            <Link
              href={`/dashboard/exhibitions/${exhibitionId}/bills`}
              className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                pathname.endsWith('/bills')
                  ? 'bg-[#7e2562] text-white border-[#7e2562] shadow-md'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-[#faedf5] hover:text-[#7e2562]'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" /> Sales & Invoices
            </Link>

            <Link
              href={`/dashboard/exhibitions/${exhibitionId}/topup`}
              className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                pathname.endsWith('/topup')
                  ? 'bg-[#7e2562] text-white border-[#7e2562] shadow-md'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-[#faedf5] hover:text-[#7e2562]'
              }`}
            >
              <Send className="w-3.5 h-3.5" /> Mid-Event TopUp
            </Link>

            <Link
              href={`/dashboard/exhibitions/${exhibitionId}/credit`}
              className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                pathname.endsWith('/credit')
                  ? 'bg-[#7e2562] text-white border-[#7e2562] shadow-md'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-[#faedf5] hover:text-[#7e2562]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> Credit Copies
            </Link>

            <Link
              href={`/dashboard/exhibitions/${exhibitionId}/day-close`}
              className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                pathname.endsWith('/day-close')
                  ? 'bg-[#7e2562] text-white border-[#7e2562] shadow-md'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-[#faedf5] hover:text-[#7e2562]'
              }`}
            >
              <Clock className="w-3.5 h-3.5" /> End of Day Close
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
