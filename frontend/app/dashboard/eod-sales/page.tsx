"use client";

import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
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
} from 'lucide-react';
import { generateBillPDF } from '@/lib/pdfUtils';

const PAYMENT_MODE_COLORS: Record<string, string> = {
  CASH:  'bg-emerald-100 text-emerald-800 border-emerald-200',
  CARD:  'bg-blue-100 text-blue-800 border-blue-200',
  UPI:   'bg-violet-100 text-violet-800 border-violet-200',
  OTHER: 'bg-gray-100 text-gray-800 border-gray-200',
};

function formatCurrency(n: number) {
  return `\u20b9${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function monthEnd(baseStr: string) {
  const [y, m] = baseStr.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return `${baseStr}-${last.toString().padStart(2, '0')}`;
}

export default function EODSalesPage() {
  const { user } = useAuth();

  const [viewMode, setViewMode]       = useState<'day' | 'month'>('day');
  const [selectedDate, setSelectedDate]   = useState(todayStr());
  const [selectedMonth, setSelectedMonth] = useState(todayStr().slice(0, 7));

  const [bills, setBills]   = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const { startDate, endDate, displayLabel } = useMemo(() => {
    if (viewMode === 'day') {
      return {
        startDate: selectedDate + 'T00:00:00',
        endDate:   selectedDate + 'T23:59:59',
        displayLabel: new Date(selectedDate).toLocaleDateString('en-IN', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        }),
      };
    }
    const [y, m] = selectedMonth.split('-').map(Number);
    return {
      startDate: `${selectedMonth}-01T00:00:00`,
      endDate:   monthEnd(selectedMonth) + 'T23:59:59',
      displayLabel: new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
    };
  }, [viewMode, selectedDate, selectedMonth]);

  useEffect(() => { fetchBills(); }, [startDate, endDate]);

  async function fetchBills() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ startDate, endDate, limit: '500' });
      const res = await api.get(`/billing?${params.toString()}`);
      const list = Array.isArray(res.data) ? res.data : (res.data?.items ?? res?.items ?? []);
      setBills(list);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load sales data');
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => {
    const completed = bills.filter(b => b.status === 'COMPLETED');
    const voided    = bills.filter(b => b.status === 'VOIDED');
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

  function shiftMonth(dir: 1 | -1) {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">EOD Sales Report</h2>
          <p className="text-sm text-gray-500 mt-0.5">End-of-day and monthly sales overview for your branch.</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Toggle */}
          <div className="inline-flex rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
            {(['day', 'month'] as const).map(m => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
                  viewMode === m ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Picker */}
          {viewMode === 'day' ? (
            <input
              type="date"
              value={selectedDate}
              max={todayStr()}
              onChange={e => setSelectedDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
            />
          ) : (
            <div className="flex items-center gap-1 border border-gray-300 rounded-lg shadow-sm bg-white px-1">
              <button onClick={() => shiftMonth(-1)} className="p-1.5 hover:bg-gray-100 rounded-md transition-colors">
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              <input
                type="month"
                value={selectedMonth}
                max={todayStr().slice(0, 7)}
                onChange={e => setSelectedMonth(e.target.value)}
                className="border-0 outline-none text-sm text-gray-700 bg-transparent px-1 py-1.5 w-36"
              />
              <button onClick={() => shiftMonth(1)} className="p-1.5 hover:bg-gray-100 rounded-md transition-colors">
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Period label */}
      <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
        <Calendar className="w-4 h-4 text-blue-500" />
        <span>{displayLabel}</span>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-blue-400 ml-1" />}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<TrendingUp className="w-5 h-5 text-emerald-600" />} bg="bg-emerald-50"
          label="Total Revenue" value={formatCurrency(stats.totalRevenue)}
          sub={`${stats.totalTransactions} completed`}
        />
        <StatCard
          icon={<ShoppingCart className="w-5 h-5 text-blue-600" />} bg="bg-blue-50"
          label="Transactions" value={String(stats.totalTransactions)}
          sub={stats.voided > 0 ? `${stats.voided} voided` : 'No voids today'}
        />
        <StatCard
          icon={<BarChart2 className="w-5 h-5 text-violet-600" />} bg="bg-violet-50"
          label="Avg Sale Value" value={formatCurrency(stats.avgSale)}
          sub="per completed bill"
        />
        <StatCard
          icon={<Banknote className="w-5 h-5 text-amber-600" />} bg="bg-amber-50"
          label="Cash Collected" value={formatCurrency(stats.byMode['CASH'] || 0)}
          sub={`UPI: ${formatCurrency(stats.byMode['UPI'] || 0)}`}
        />
      </div>

      {/* Payment breakdown */}
      {Object.keys(stats.byMode).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-gray-400" />
            Payment Mode Breakdown
          </h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(stats.byMode).map(([mode, amt]) => (
              <div
                key={mode}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${PAYMENT_MODE_COLORS[mode] || PAYMENT_MODE_COLORS.OTHER}`}
              >
                <span className="text-xs font-bold uppercase tracking-wide">{mode}</span>
                <span className="text-sm font-semibold">{formatCurrency(amt)}</span>
                <span className="text-xs opacity-60">
                  {stats.totalRevenue > 0 ? `${((amt / stats.totalRevenue) * 100).toFixed(1)}%` : '0%'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bills table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Bills</h3>
          <span className="text-xs text-gray-400">{bills.length} record{bills.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase border-b">
              <tr>
                <th className="px-6 py-3">Bill No.</th>
                <th className="px-6 py-3">Time</th>
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3">Mode</th>
                <th className="px-6 py-3">Items</th>
                <th className="px-6 py-3 text-right">Amount</th>
                <th className="px-6 py-3 text-center">Status</th>
                <th className="px-6 py-3 text-center">PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
                  </td>
                </tr>
              ) : bills.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm font-medium">No sales found for this period</p>
                    <p className="text-gray-400 text-xs mt-1">Try selecting a different date or month</p>
                  </td>
                </tr>
              ) : (
                bills.map((bill: any) => (
                  <tr key={bill.id} className={`hover:bg-gray-50 transition-colors ${bill.status === 'VOIDED' ? 'opacity-55' : ''}`}>
                    <td className="px-6 py-3 font-mono text-xs font-semibold text-gray-800">{bill.billNumber}</td>
                    <td className="px-6 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(bill.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      {viewMode === 'month' && (
                        <div className="text-[10px] text-gray-400">
                          {new Date(bill.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-3 text-gray-700">{bill.customerName || <span className="text-gray-400">Walk-in</span>}</td>
                    <td className="px-6 py-3">
                      {bill.status === 'COMPLETED' ? (
                        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${PAYMENT_MODE_COLORS[bill.paymentMode] || PAYMENT_MODE_COLORS.OTHER}`}>
                          {bill.paymentMode || 'CASH'}
                        </span>
                      ) : (
                        <span className="text-xs font-medium px-2.5 py-0.5 rounded-full border bg-red-100 text-red-700 border-red-200">VOIDED</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-gray-500">{bill.items?.length ?? '-'}</td>
                    <td className="px-6 py-3 text-right font-semibold text-gray-900">
                      {bill.status === 'VOIDED'
                        ? <span className="line-through text-gray-400">{formatCurrency(bill.totalAmount)}</span>
                        : formatCurrency(bill.totalAmount)
                      }
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                        bill.status === 'COMPLETED'
                          ? 'bg-green-100 text-green-700 border-green-200'
                          : 'bg-red-100 text-red-700 border-red-200'
                      }`}>
                        {bill.status === 'COMPLETED' ? 'Paid' : 'Void'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <button
                        onClick={() => generateBillPDF(bill, bill.items || [], bill.branch || bill.branchId)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Download PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && bills.length > 0 && (
              <tfoot className="bg-gray-50 border-t border-gray-200">
                <tr>
                  <td colSpan={5} className="px-6 py-3 text-sm font-semibold text-gray-700">Total Revenue</td>
                  <td className="px-6 py-3 text-right font-bold text-gray-900 text-sm">{formatCurrency(stats.totalRevenue)}</td>
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
  label: string; value: string; sub: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-start gap-4">
      <div className={`${bg} p-2.5 rounded-xl shrink-0`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide truncate">{label}</p>
        <p className="text-xl font-bold text-gray-900 mt-0.5 truncate">{value}</p>
        <p className="text-xs text-gray-400 mt-0.5 truncate">{sub}</p>
      </div>
    </div>
  );
}
