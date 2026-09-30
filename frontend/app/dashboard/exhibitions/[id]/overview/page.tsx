"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useExhibitionWorkspace } from '../ExhibitionContext';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine 
} from 'recharts';
import { 
  TrendingUp, AlertTriangle, ArrowRight, Trophy
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

export default function ExhibitionOverviewDashboardPage() {
  const { exhibitionId, exhibition, data, metrics } = useExhibitionWorkspace();
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');

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

    // 1. If bills list is present, compute EXCLUSIVELY from bills in client local timezone
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
      // 2. Fallback to backend curve if bills list is not loaded yet
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

  const isDispatched = ['DISPATCHED', 'ONGOING', 'CLOSED', 'OVERDUE'].includes(exhibition?.status || '');

  // Restock needed items (Low stock or Out of Stock)
  const rawStock = isDispatched 
    ? ((exhibition?.stock && exhibition.stock.length > 0)
        ? exhibition.stock
        : (data?.eventToDate?.sellThroughList || []))
    : [];

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

  // Top selling titles
  const topSellers = data?.eventToDate?.topByUnits || [];

  return (
    <div className="space-y-6">
      {/* Top Metrics Cards (Grid of 4) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#7e2562]/10 rounded-xl p-5 shadow-sm space-y-1 hover:border-[#7e2562]/30 transition-all">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Live Sales Revenue</span>
          <span className="text-2xl font-black text-[#7e2562] font-mono block">
            ₹{Number(metrics?.totalRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-slate-400 block font-mono">
            Cash: ₹{metrics?.cashTotal || 0} | UPI: ₹{metrics?.upiTotal || 0}
          </span>
        </div>

        <div className="bg-white border border-[#7e2562]/10 rounded-xl p-5 shadow-sm space-y-1 hover:border-[#7e2562]/30 transition-all">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Copies Sold Today</span>
          <span className="text-2xl font-black text-slate-900 font-mono block">
            {metrics?.totalSold || 0}
          </span>
          <span className="text-[10px] text-slate-400 block font-mono">
            Today's Invoices: {data?.today?.billCount || 0} bills
          </span>
        </div>

        <div className="bg-white border border-[#7e2562]/10 rounded-xl p-5 shadow-sm space-y-1 hover:border-[#7e2562]/30 transition-all">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Available Venue Stock</span>
          <span className="text-2xl font-black text-[#7e2562] font-mono block">
            {metrics?.totalRemaining || 0}
          </span>
          <span className="text-[10px] text-slate-400 block font-mono">
            Dispatched: {metrics?.totalDispatched || 0} copies
          </span>
        </div>

        <div className="bg-white border border-[#7e2562]/10 rounded-xl p-5 shadow-sm space-y-1 hover:border-[#7e2562]/30 transition-all">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Restock Needed Alerts</span>
          <span className="text-2xl font-black text-amber-600 font-mono block">
            {restockAlertItems.length}
          </span>
          <span className="text-[10px] text-slate-400 block">
            Titles with &le; 5 copies left
          </span>
        </div>
      </div>

      {/* Main Dual-Column Surface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Dashboard Graph with Line & Bar Toggle */}
        <div className="lg:col-span-8 space-y-6">
          {/* Live Sales Graph Panel */}
          <div className="bg-white border border-[#7e2562]/15 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-3 gap-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#7e2562]" />
                <h3 className="text-sm font-bold text-gray-900 tracking-wider">
                  Today's Live Sales Trend (Revenue in ₹)
                </h3>
              </div>

              <div className="flex items-center gap-3">
                {/* Line / Bar Toggle Button Group */}
                <div className="flex items-center space-x-1 bg-[#faedf5]/60 p-1 rounded-lg border border-[#7e2562]/10">
                  <button
                    type="button"
                    onClick={() => setChartType('line')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
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
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                      chartType === 'bar'
                        ? 'bg-[#7e2562] text-white shadow-xs'
                        : 'text-gray-600 hover:text-[#7e2562]'
                    }`}
                  >
                    Bar
                  </button>
                </div>

                <span className="text-xs font-mono text-[#7e2562] font-bold">
                  Peak: ₹{peakRevenue.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'line' ? (
                  <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3e8f0" />
                    <XAxis dataKey="hour" axisLine={false} tickLine={false} stroke="#9ca3af" fontSize={11} />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      stroke="#9ca3af" 
                      fontSize={11} 
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
                      strokeWidth={3} 
                      dot={false}
                      activeDot={{ r: 6, fill: '#7e2562', stroke: '#fff', strokeWidth: 2 }} 
                    />
                  </LineChart>
                ) : (
                  <BarChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3e8f0" />
                    <XAxis dataKey="hour" axisLine={false} tickLine={false} stroke="#9ca3af" fontSize={11} />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      stroke="#9ca3af" 
                      fontSize={11} 
                      tickFormatter={(v) => `₹${v}`} 
                      domain={[0, peakRevenue > 0 ? 'auto' : 500]}
                    />
                    <RechartsTooltip content={<CustomChartTooltip />} cursor={{ fill: '#faedf5', opacity: 0.6 }} />
                    <Bar dataKey="revenue" name="Revenue" fill="#7e2562" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Restock Alerts & Top Best-Selling Titles */}
        <div className="lg:col-span-4 space-y-6">
          {/* Restock Needed Books Alert Card */}
          <div className="bg-white border border-[#7e2562]/10 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-xs font-black uppercase text-amber-600 tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" /> Restock Needed ({restockAlertItems.length})
              </h3>
              <Link
                href={`/dashboard/exhibitions/${exhibitionId}/topup`}
                className="px-2.5 py-1 text-[10px] font-extrabold text-[#7e2562] hover:text-white bg-[#faedf5] hover:bg-[#7e2562] border border-[#7e2562]/20 hover:border-[#7e2562] rounded-md transition-all shadow-xs flex items-center gap-1 active:scale-95 cursor-pointer"
              >
                Request Top-Up <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {restockAlertItems.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 italic">
                All titles have sufficient venue stock (&gt; 5 copies).
              </div>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {restockAlertItems.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                    <div className="min-w-0 flex-1 pr-2">
                      <span className="font-bold text-slate-900 block truncate">{item.title}</span>
                      <span className="text-[10px] text-slate-500 font-mono">ISBN: {item.isbn}</span>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase shrink-0 ${
                      item.availableQty === 0 ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {item.availableQty === 0 ? 'Out of Stock' : `${item.availableQty} Left`}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {restockAlertItems.length > 0 && (
              <Link
                href={`/dashboard/exhibitions/${exhibitionId}/topup`}
                className="w-full py-3 text-xs font-bold text-center text-white bg-[#7e2562] hover:bg-[#671e50] rounded-xl transition block shadow-sm cursor-pointer"
              >
                Request Mid-Event Restock
              </Link>
            )}
          </div>

          {/* Top Best-Selling Titles Panel */}
          <div className="bg-white border border-[#7e2562]/10 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-2 border-b pb-3">
              <Trophy className="w-4 h-4 text-amber-500" /> Top Best-Selling Titles at Venue
            </h3>

            {topSellers.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 italic">No sales recorded yet today.</div>
            ) : (
              <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                {topSellers.slice(0, 5).map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-[#7e2562] text-white flex items-center justify-center font-black text-xs shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-slate-900 block truncate">{item.book?.title || 'Book Title'}</span>
                        <span className="text-[10px] text-slate-500">Units Sold: {item.unitsSold}</span>
                      </div>
                    </div>

                    <span className="font-black text-[#7e2562] font-mono text-xs shrink-0 ml-2">
                      ₹{item.revenue}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
