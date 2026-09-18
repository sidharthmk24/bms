"use client";

import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApiData } from '@/hooks/useApiData';
import { api } from '@/lib/api';
import {
  Calendar,
  TrendingUp,
  ShoppingCart,
  CreditCard,
  Banknote,
  Download,
  Loader2,
  FileText,
  BarChart2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  X,
  Building2,
} from 'lucide-react';
import { Dropdown } from '@/components/Dropdown';
import { generateBillPDF } from '@/lib/pdfUtils';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  Cell,
} from 'recharts';

const PAYMENT_MODE_COLORS: Record<string, string> = {
  CASH:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  CARD:  'bg-purple-50 text-purple-700 border-purple-200',
  UPI:   'bg-blue-50 text-blue-700 border-blue-200',
  CREDIT: 'bg-[#faedf5] text-[#7e2562] border-[#7e2562]/20',
  CREDIT_COPY: 'bg-[#faedf5] text-[#7e2562] border-[#7e2562]/20',
  OTHER: 'bg-neutral-100 text-neutral-800 border-neutral-200',
};

function formatCurrency(n: number) {
  return `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function monthEnd(baseStr: string) {
  const [y, m] = baseStr.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return `${baseStr}-${last.toString().padStart(2, '0')}`;
}

export function EODSalesView({ defaultBranchId }: { defaultBranchId?: string }) {
  const { user } = useAuth();
  const isChainWideUser = !user?.branchId || ['SUPER_ADMIN', 'ADMIN', 'FINANCE', 'CENTRAL_INVENTORY_MANAGER'].includes(user?.role || user?.primaryRole || '');

  // Fetch branches for branch switcher
  const { data: branchesResponse } = useApiData<any>('/branches');
  const branchesList: any[] = branchesResponse?.items || (Array.isArray(branchesResponse) ? branchesResponse : (branchesResponse?.data || []));
  const retailBranches = branchesList.filter((b: any) => b.isActive !== false && b.type !== 'WAREHOUSE' && b.name?.toLowerCase() !== 'central warehouse');

  const [selectedBranch, setSelectedBranch] = useState<string>(defaultBranchId || user?.branchId || 'all');
  const [viewMode, setViewMode] = useState<'day' | 'month'>('day');
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [selectedMonth, setSelectedMonth] = useState(todayStr().slice(0, 7));

  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentModeFilter, setPaymentModeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Sorting State
  type SortField = 'createdAt' | 'totalAmount' | 'billNumber' | 'customerName';
  type SortDirection = 'asc' | 'desc';
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'totalAmount' || field === 'createdAt' ? 'desc' : 'asc');
    }
  };

  const filteredBills = useMemo(() => {
    return bills.filter((bill) => {
      // Payment mode filter
      if (paymentModeFilter !== 'all') {
        const mode = bill.paymentMode || 'CASH';
        if (mode !== paymentModeFilter) return false;
      }
      // Status filter
      if (statusFilter !== 'all') {
        if (bill.status !== statusFilter) return false;
      }
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchBillNo = (bill.billNumber || '').toLowerCase().includes(q);
        const matchCustomer = (bill.customerName || '').toLowerCase().includes(q);
        const matchBranch = (bill.branch?.name || '').toLowerCase().includes(q);
        if (!matchBillNo && !matchCustomer && !matchBranch) return false;
      }
      return true;
    });
  }, [bills, paymentModeFilter, statusFilter, searchQuery]);

  const sortedBills = useMemo(() => {
    return [...filteredBills].sort((a: any, b: any) => {
      let comparison = 0;
      if (sortField === 'createdAt') {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortField === 'totalAmount') {
        comparison = Number(a.totalAmount || 0) - Number(b.totalAmount || 0);
      } else if (sortField === 'billNumber') {
        comparison = (a.billNumber || '').localeCompare(b.billNumber || '');
      } else if (sortField === 'customerName') {
        comparison = (a.customerName || 'Walk-in').localeCompare(b.customerName || 'Walk-in');
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredBills, sortField, sortDirection]);

  const { startDate, endDate, displayLabel } = useMemo(() => {
    if (viewMode === 'day') {
      return {
        startDate: selectedDate + 'T00:00:00',
        endDate: selectedDate + 'T23:59:59',
        displayLabel: new Date(selectedDate).toLocaleDateString('en-IN', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        }),
      };
    }
    const [y, m] = selectedMonth.split('-').map(Number);
    return {
      startDate: `${selectedMonth}-01T00:00:00`,
      endDate: monthEnd(selectedMonth) + 'T23:59:59',
      displayLabel: new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
    };
  }, [viewMode, selectedDate, selectedMonth]);

  useEffect(() => { fetchBills(); }, [startDate, endDate, selectedBranch]);

  async function fetchBills() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ startDate, endDate, limit: '1000' });
      if (selectedBranch && selectedBranch !== 'all') {
        params.append('branchId', selectedBranch);
      }
      const res = await api.get(`/billing?${params.toString()}`);
      const list = Array.isArray(res.data) ? res.data : ((res.data as any)?.items ?? (res as any)?.items ?? []);
      setBills(list);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load sales data');
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => {
    const completed = bills.filter(b => b.status === 'COMPLETED');
    const voided = bills.filter(b => b.status === 'VOIDED');
    const totalRevenue = completed.reduce((s, b) => s + Number(b.totalAmount || 0), 0);
    const byMode: Record<string, number> = {};
    completed.forEach(b => {
      const mode = b.paymentMode || 'CASH';
      byMode[mode] = (byMode[mode] || 0) + Number(b.totalAmount || 0);
    });
    return {
      totalRevenue,
      totalTransactions: completed.length,
      voided: voided.length,
      byMode,
      avgSale: completed.length > 0 ? totalRevenue / completed.length : 0,
    };
  }, [bills]);

  // Generate chart data depending on day view (hourly) or month view (daily)
  const chartData = useMemo(() => {
    const completed = bills.filter(b => b.status === 'COMPLETED');

    if (viewMode === 'day') {
      // Create hourly buckets from 08:00 to 22:00
      const hourlyMap = new Map<number, { hourLabel: string; sales: number; billsCount: number }>();
      for (let h = 8; h <= 21; h++) {
        const period = h >= 12 ? 'PM' : 'AM';
        const displayH = h % 12 === 0 ? 12 : h % 12;
        hourlyMap.set(h, {
          hourLabel: `${displayH} ${period}`,
          sales: 0,
          billsCount: 0,
        });
      }

      completed.forEach(b => {
        const d = new Date(b.createdAt);
        const h = d.getHours();
        if (hourlyMap.has(h)) {
          const item = hourlyMap.get(h)!;
          item.sales += Number(b.totalAmount || 0);
          item.billsCount += 1;
        } else if (h >= 0 && h <= 23) {
          // If outside 8-21, place in adjacent bucket
          const fallbackKey = h < 8 ? 8 : 21;
          const item = hourlyMap.get(fallbackKey)!;
          item.sales += Number(b.totalAmount || 0);
          item.billsCount += 1;
        }
      });

      return Array.from(hourlyMap.entries()).map(([_, val]) => ({
        label: val.hourLabel,
        sales: Math.round(val.sales * 100) / 100,
        billsCount: val.billsCount,
      }));
    } else {
      // Month view: create buckets for each day of the month
      const [y, m] = selectedMonth.split('-').map(Number);
      const totalDays = new Date(y, m, 0).getDate();
      const dailyMap = new Map<string, { label: string; sales: number; billsCount: number }>();

      for (let d = 1; d <= totalDays; d++) {
        const dStr = `${selectedMonth}-${String(d).padStart(2, '0')}`;
        dailyMap.set(dStr, {
          label: `${d} ${new Date(y, m - 1, d).toLocaleString('en-US', { month: 'short' })}`,
          sales: 0,
          billsCount: 0,
        });
      }

      completed.forEach(b => {
        const dStr = new Date(b.createdAt).toISOString().slice(0, 10);
        if (dailyMap.has(dStr)) {
          const item = dailyMap.get(dStr)!;
          item.sales += Number(b.totalAmount || 0);
          item.billsCount += 1;
        }
      });

      return Array.from(dailyMap.values()).map(val => ({
        label: val.label,
        sales: Math.round(val.sales * 100) / 100,
        billsCount: val.billsCount,
      }));
    }
  }, [bills, viewMode, selectedMonth]);

  function shiftMonth(dir: 1 | -1) {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-neutral-900">EOD Sales Report</h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            End-of-day sales overview {selectedBranch === 'all' ? 'across all branches' : 'for selected branch'}.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Branch Filter Dropdown for Chain-Wide / Admin Roles */}
          {isChainWideUser && (
            <div className="w-52 shrink-0">
              <Dropdown
                value={selectedBranch}
                onChange={(val) => setSelectedBranch(val)}
                options={[
                  { value: 'all', label: 'All Branches' },
                  ...retailBranches.map((b: any) => ({
                    value: b.id,
                    label: b.name
                  }))
                ]}
                selectClassName="!py-2 !rounded-sm !text-xs font-bold border-[#7e2562]/20 bg-white"
              />
            </div>
          )}

          {/* Day / Month Toggle */}
          <div className="inline-flex rounded-sm border border-[#7e2562]/20 bg-white shadow-xs overflow-hidden">
            {(['day', 'month'] as const).map(m => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={`px-3.5 py-1.5 text-xs font-semibold capitalize transition-all cursor-pointer ${
                  viewMode === m ? 'bg-[#7e2562] text-white' : 'text-neutral-600 hover:bg-[#faf6f9]'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Date Picker */}
          {viewMode === 'day' ? (
            <input
              type="date"
              value={selectedDate}
              max={todayStr()}
              onChange={e => setSelectedDate(e.target.value)}
              className="border border-[#7e2562]/20 rounded-sm px-3 py-1.5 text-xs text-neutral-900 bg-white focus:outline-none focus:ring-1 focus:ring-[#7e2562] shadow-xs font-medium"
            />
          ) : (
            <div className="flex items-center gap-1 bg-white border border-[#7e2562]/20 rounded-sm px-2 py-1 shadow-xs">
              <button
                onClick={() => shiftMonth(-1)}
                className="p-1 hover:bg-[#faedf5] text-[#7e2562] rounded-sm transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-bold text-neutral-900 px-2 min-w-[110px] text-center">
                {displayLabel}
              </span>
              <button
                onClick={() => shiftMonth(1)}
                className="p-1 hover:bg-[#faedf5] text-[#7e2562] rounded-sm transition-colors cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            onClick={fetchBills}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#7e2562] hover:bg-[#681b50] text-white text-xs font-semibold rounded-sm shadow-xs transition-all disabled:opacity-60 cursor-pointer"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TrendingUp className="w-3.5 h-3.5" />}
            Refresh
          </button>
        </div>
      </div>

      {/* Period & Branch Indicators */}
      <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-neutral-700 font-medium">
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-[#7e2562]" />
          <span>{displayLabel}</span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[11px] font-bold bg-[#faedf5] text-[#7e2562] border border-[#7e2562]/20">
            <Building2 className="w-3 h-3 text-[#7e2562]" />
            <span>{selectedBranch === 'all' ? 'All Branches' : (retailBranches.find(b => b.id === selectedBranch)?.name || 'Branch')}</span>
          </span>
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#7e2562] ml-1" />}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-[#e45e34] bg-[#fef5f2] border border-[#e45e34]/20 rounded-sm px-4 py-2.5 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<TrendingUp className="w-5 h-5 text-emerald-600" />} bg="bg-emerald-50"
          label="Total Revenue" value={formatCurrency(stats.totalRevenue)}
        />
        <StatCard
          icon={<ShoppingCart className="w-5 h-5 text-[#7e2562]" />} bg="bg-[#faedf5]"
          label="Transactions" value={String(stats.totalTransactions)}
        />
        <StatCard
          icon={<BarChart2 className="w-5 h-5 text-violet-600" />} bg="bg-violet-50"
          label="Avg Sale Value" value={formatCurrency(stats.avgSale)}
        />
        <StatCard
          icon={<Banknote className="w-5 h-5 text-amber-600" />} bg="bg-amber-50"
          label="Cash Collected" value={formatCurrency(stats.byMode['CASH'] || 0)}
        />
      </div>

      {/* EOD Sales Graph */}
      <div className="bg-white p-5 rounded-sm shadow-xs border border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-gray-800">
              {viewMode === 'day' ? 'Hourly Sales Distribution' : 'Daily Sales Trend'}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {viewMode === 'day'
                ? `Completed sales volume by hour for ${displayLabel}`
                : `Sales performance day-by-day in ${displayLabel}`}
            </p>
          </div>
          
          <div className="flex items-center gap-3 flex-wrap">
            {/* Chart Type Toggle */}
            <div className="inline-flex rounded-sm border border-[#7e2562]/20 bg-[#faf6f9] p-0.5 shadow-2xs">
              <button
                onClick={() => setChartType('bar')}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-xs transition-all cursor-pointer ${
                  chartType === 'bar'
                    ? 'bg-white text-[#7e2562] shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
                title="Bar Chart View"
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span>Bar</span>
              </button>
              <button
                onClick={() => setChartType('line')}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-xs transition-all cursor-pointer ${
                  chartType === 'line'
                    ? 'bg-white text-[#7e2562] shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
                title="Line / Trend View"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Line</span>
              </button>
            </div>

            <span className="text-xs font-bold text-[#7e2562] bg-[#faedf5] px-2.5 py-1 rounded-sm border border-[#7e2562]/20">
              Total: {formatCurrency(stats.totalRevenue)}
            </span>
          </div>
        </div>

        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'bar' ? (
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3e8f0" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  stroke="#9ca3af"
                  fontSize={11}
                  tickMargin={8}
                  minTickGap={viewMode === 'month' ? 25 : 15}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  stroke="#9ca3af"
                  fontSize={11}
                  tickCount={5}
                  domain={[0, 'auto']}
                  tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <RechartsTooltip
                  content={({ active, payload, label }: any) => {
                    if (active && payload && payload.length) {
                      const dataPoint = payload[0].payload;
                      return (
                        <div className="bg-white p-3 border border-[#7e2562]/20 shadow-md rounded-sm z-50">
                          <p className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wider">{label}</p>
                          <p className="text-sm font-bold text-[#7e2562]">
                            Sales : {formatCurrency(dataPoint.sales)}
                          </p>
                          <p className="text-xs text-gray-600 mt-0.5 font-medium">
                            Bills : {dataPoint.billsCount}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                  cursor={{ fill: '#faedf5', opacity: 0.6 }}
                />
                <Bar dataKey="sales" name="Sales" radius={[2, 2, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.sales > 0 ? '#7e2562' : '#e5e7eb'}
                    />
                  ))}
                </Bar>
              </BarChart>
            ) : (
              <AreaChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEodSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7e2562" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#7e2562" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3e8f0" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  stroke="#9ca3af"
                  fontSize={11}
                  tickMargin={8}
                  minTickGap={viewMode === 'month' ? 25 : 15}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  stroke="#9ca3af"
                  fontSize={11}
                  tickCount={5}
                  domain={[0, 'auto']}
                  tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <RechartsTooltip
                  content={({ active, payload, label }: any) => {
                    if (active && payload && payload.length) {
                      const dataPoint = payload[0].payload;
                      return (
                        <div className="bg-white p-3 border border-[#7e2562]/20 shadow-md rounded-sm z-50">
                          <p className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wider">{label}</p>
                          <p className="text-sm font-bold text-[#7e2562]">
                            Sales : {formatCurrency(dataPoint.sales)}
                          </p>
                          <p className="text-xs text-gray-600 mt-0.5 font-medium">
                            Bills : {dataPoint.billsCount}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                  cursor={{ stroke: '#faedf5', strokeWidth: 2 }}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  name="Sales"
                  stroke="#7e2562"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorEodSales)"
                  dot={false}
                  activeDot={{ r: 5, fill: "#7e2562", stroke: "#fff", strokeWidth: 2 }}
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Payment breakdown */}
      {Object.keys(stats.byMode).length > 0 && (
        <div className="bg-white rounded-sm border border-neutral-200/80 shadow-xs p-4">
          <h3 className="text-xs font-bold text-[#7e2562] uppercase tracking-wider mb-3 flex items-center gap-2">
            <CreditCard className="w-3.5 h-3.5 text-[#7e2562]" />
            Payment Mode Breakdown
          </h3>
          <div className="flex flex-wrap gap-2.5">
            {Object.entries(stats.byMode).map(([mode, amt]) => (
              <div
                key={mode}
                className={`flex items-center gap-2.5 rounded-sm px-3.5 py-2 border ${PAYMENT_MODE_COLORS[mode] || PAYMENT_MODE_COLORS.OTHER}`}
              >
                <span className="text-[11px] font-bold uppercase tracking-wider">{mode.replace('_', ' ')}</span>
                <span className="text-xs font-bold">{formatCurrency(amt)}</span>
                <span className="text-[11px] opacity-70">
                  {stats.totalRevenue > 0 ? `${((amt / stats.totalRevenue) * 100).toFixed(1)}%` : '0%'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bills Table */}
      <div className="bg-white rounded-sm border border-neutral-200/80 shadow-xs relative z-10">
        <div className="px-5 py-3.5 border-b border-neutral-100 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-neutral-900">Bills</h3>
            <span className="text-xs text-neutral-400 font-medium">
              ({sortedBills.length}{sortedBills.length !== bills.length ? ` of ${bills.length}` : ''} record{sortedBills.length !== 1 ? 's' : ''})
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative w-full sm:w-52">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search bill, customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 text-xs border border-[#7e2562]/20 rounded-sm focus:outline-none focus:ring-1 focus:ring-[#7e2562] focus:border-[#7e2562] text-neutral-900 bg-white placeholder:text-neutral-400 font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Payment Mode Filter */}
            <div className="w-full sm:w-32 shrink-0">
              <Dropdown
                value={paymentModeFilter}
                onChange={(val) => setPaymentModeFilter(val)}
                options={[
                  { value: 'all', label: 'All Modes' },
                  { value: 'CASH', label: 'Cash' },
                  { value: 'UPI', label: 'UPI' },
                  { value: 'CREDIT', label: 'Credit Copy' },
                ]}
                selectClassName="!py-1.5 !rounded-sm !text-xs font-semibold border-[#7e2562]/20 bg-white"
              />
            </div>

            {/* Status Filter */}
            <div className="w-full sm:w-32 shrink-0">
              <Dropdown
                value={statusFilter}
                onChange={(val) => setStatusFilter(val)}
                options={[
                  { value: 'all', label: 'All Statuses' },
                  { value: 'COMPLETED', label: 'Paid' },
                  { value: 'VOIDED', label: 'Voided' },
                ]}
                selectClassName="!py-1.5 !rounded-sm !text-xs font-semibold border-[#7e2562]/20 bg-white"
              />
            </div>

            {/* Sort Dropdown */}
            <div className="w-full sm:w-48 shrink-0">
              <Dropdown
                value={`${sortField}_${sortDirection}`}
                onChange={(val) => {
                  const [f, d] = val.split('_') as [SortField, SortDirection];
                  setSortField(f);
                  setSortDirection(d);
                }}
                options={[
                  { value: 'createdAt_desc', label: 'Time: Newest First' },
                  { value: 'createdAt_asc', label: 'Time: Oldest First' },
                  { value: 'totalAmount_desc', label: 'Amount: High-Low' },
                  { value: 'totalAmount_asc', label: 'Amount: Low-High' },
                  { value: 'billNumber_asc', label: 'Bill No: A-Z' },
                  { value: 'billNumber_desc', label: 'Bill No: Z-A' },
                  { value: 'customerName_asc', label: 'Customer: A-Z' },
                  { value: 'customerName_desc', label: 'Customer: Z-A' },
                ]}
                selectClassName="!py-1.5 !rounded-sm !text-xs font-semibold border-[#7e2562]/20 bg-white"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-b-sm">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#faf6f9]/70 text-[11px] font-bold text-[#7e2562] uppercase tracking-wider border-b border-[#7e2562]/10 whitespace-nowrap">
              <tr>
                <th
                  onClick={() => toggleSort('billNumber')}
                  className="px-5 py-3 cursor-pointer select-none hover:bg-[#faedf5]/50 transition-colors group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Bill No.</span>
                    {sortField === 'billNumber' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-[#7e2562]" /> : <ArrowDown className="w-3 h-3 text-[#7e2562]" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-neutral-400 opacity-50 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('createdAt')}
                  className="px-5 py-3 cursor-pointer select-none hover:bg-[#faedf5]/50 transition-colors group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Time</span>
                    {sortField === 'createdAt' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-[#7e2562]" /> : <ArrowDown className="w-3 h-3 text-[#7e2562]" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-neutral-400 opacity-50 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                </th>
                {selectedBranch === 'all' && (
                  <th className="px-5 py-3">Branch</th>
                )}
                <th
                  onClick={() => toggleSort('customerName')}
                  className="px-5 py-3 cursor-pointer select-none hover:bg-[#faedf5]/50 transition-colors group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Customer</span>
                    {sortField === 'customerName' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-[#7e2562]" /> : <ArrowDown className="w-3 h-3 text-[#7e2562]" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-neutral-400 opacity-50 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                </th>
                <th className="px-5 py-3">Mode</th>
                <th className="px-5 py-3">Items</th>
                <th
                  onClick={() => toggleSort('totalAmount')}
                  className="px-5 py-3 text-right cursor-pointer select-none hover:bg-[#faedf5]/50 transition-colors group"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Amount</span>
                    {sortField === 'totalAmount' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-[#7e2562]" /> : <ArrowDown className="w-3 h-3 text-[#7e2562]" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-neutral-400 opacity-50 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                </th>
                <th className="px-5 py-3 text-center">Status</th>
                <th className="px-5 py-3 text-center">PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr>
                  <td colSpan={selectedBranch === 'all' ? 9 : 8} className="px-5 py-10 text-center">
                    <Loader2 className="w-7 h-7 animate-spin text-[#7e2562] mx-auto" />
                  </td>
                </tr>
              ) : bills.length === 0 ? (
                <tr>
                  <td colSpan={selectedBranch === 'all' ? 9 : 8} className="px-5 py-12 text-center">
                    <FileText className="w-10 h-10 text-neutral-200 mx-auto mb-2" />
                    <p className="text-neutral-500 text-xs font-medium">No sales found for this period</p>
                    <p className="text-neutral-400 text-[11px] mt-0.5">Try selecting a different branch, date, or month</p>
                  </td>
                </tr>
              ) : sortedBills.length === 0 ? (
                <tr>
                  <td colSpan={selectedBranch === 'all' ? 9 : 8} className="px-5 py-10 text-center">
                    <Search className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                    <p className="text-neutral-700 text-xs font-bold">No matching bills found</p>
                    <p className="text-neutral-400 text-[11px] mt-0.5">Try adjusting your search query or filter options</p>
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setPaymentModeFilter('all');
                        setStatusFilter('all');
                      }}
                      className="mt-2.5 inline-flex items-center text-xs font-bold text-[#7e2562] hover:underline cursor-pointer"
                    >
                      Reset Filters
                    </button>
                  </td>
                </tr>
              ) : (
                sortedBills.map((bill: any) => (
                  <tr key={bill.id} className={`hover:bg-[#faf6f9]/40 transition-colors ${bill.status === 'VOIDED' ? 'opacity-55' : ''}`}>
                    <td className="px-5 py-3 font-mono text-xs font-semibold text-neutral-900">{bill.billNumber}</td>
                    <td className="px-5 py-3 text-neutral-500 whitespace-nowrap">
                      {new Date(bill.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      {viewMode === 'month' && (
                        <div className="text-[10px] text-neutral-400">
                          {new Date(bill.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </div>
                      )}
                    </td>
                    {selectedBranch === 'all' && (
                      <td className="px-5 py-3 text-neutral-700 text-xs font-medium whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-sm bg-[#faf6f9] text-[#7e2562] border border-[#7e2562]/15 text-[11px] font-bold">
                          {bill.branch?.name || 'Branch'}
                        </span>
                      </td>
                    )}
                    <td className="px-5 py-3 text-neutral-700 font-medium">{bill.customerName || <span className="text-neutral-400 italic">Walk-in</span>}</td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      {bill.status === 'COMPLETED' ? (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm border ${PAYMENT_MODE_COLORS[bill.paymentMode] || PAYMENT_MODE_COLORS.OTHER}`}>
                          {bill.paymentMode?.replace('_', ' ') || 'CASH'}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-sm border bg-[#fef5f2] text-[#e45e34] border-[#e45e34]/30">VOIDED</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-neutral-600 font-medium">{bill.items?.length ?? '-'}</td>
                    <td className="px-5 py-3 text-right font-bold text-neutral-900">
                      {bill.status === 'VOIDED'
                        ? <span className="line-through text-neutral-400">{formatCurrency(bill.totalAmount)}</span>
                        : formatCurrency(bill.totalAmount)
                      }
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm border ${
                        bill.status === 'COMPLETED'
                          ? 'bg-[#f0fbf5] text-[#3cb976] border-[#3cb976]/30'
                          : 'bg-[#fef5f2] text-[#e45e34] border-[#e45e34]/30'
                      }`}>
                        {bill.status === 'COMPLETED' ? 'Paid' : 'Void'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <button
                        onClick={() => generateBillPDF(bill, bill.items || [], bill.branch || bill.branchId)}
                        className="p-1 text-[#7e2562] hover:bg-[#faedf5] rounded-sm transition-colors inline-flex cursor-pointer"
                        title="Download PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && bills.length > 0 && (
              <tfoot className="bg-[#faf6f9]/50 border-t border-neutral-200">
                <tr>
                  <td colSpan={selectedBranch === 'all' ? 6 : 5} className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-[#7e2562]">Total Revenue</td>
                  <td className="px-5 py-3 text-right font-bold text-neutral-900 text-xs">{formatCurrency(stats.totalRevenue)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, bg, label, value, sub }: {
  icon: React.ReactNode; bg: string;
  label: string; value: string; sub?: string;
}) {
  return (
    <div className="bg-white rounded-sm border border-neutral-200/80 shadow-xs p-4 flex items-start gap-3.5">
      <div className={`${bg} p-2 rounded-sm shrink-0`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] text-neutral-500 font-bold uppercase tracking-wider truncate">{label}</p>
        <p className="text-lg font-bold text-neutral-900 mt-0.5 truncate">{value}</p>
        {sub && <p className="text-xs text-neutral-400 mt-0.5 truncate font-medium">{sub}</p>}
      </div>
    </div>
  );
}
