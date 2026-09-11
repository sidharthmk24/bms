"use client";

import { useApiData } from '@/hooks/useApiData';
import { StatCard } from '@/components/StatCard';
import { DollarSign, TrendingDown, TrendingUp, AlertCircle, Loader2, Calendar } from 'lucide-react';
import Link from 'next/link';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend
} from 'recharts';
import { useState } from 'react';
import { Dropdown } from '@/components/Dropdown';

export default function FinanceDashboard() {
  const [days, setDays] = useState('30');

  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - parseInt(days));
  const startDateStr = pastDate.toISOString().split('T')[0];
  const endDateStr = new Date().toISOString().split('T')[0];

  const { data: dashboardData, loading: dashLoading, error: dashError } = useApiData<any>(`/dashboard/finance?days=${days}`);
  const { data: branchData, loading: branchLoading } = useApiData<any>(`/finance/reports/branch-comparison?startDate=${startDateStr}&endDate=${endDateStr}`);
  const { data: expensesData, loading: expensesLoading } = useApiData<any>('/finance/expenses');

  const loading = dashLoading || branchLoading || expensesLoading;
  const error = dashError;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#7e2562]" />
      </div>
    );
  }

  if (error) {
    return <div className="text-[#e45e34] bg-[#fef5f2] border border-[#e45e34]/20 p-4 rounded-sm">Error: {error}</div>;
  }

  // Slice to get top 5 expenses for the table
  const recentExpenses = Array.isArray(expensesData) ? expensesData.slice(0, 5) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900">Finance Overview</h2>
          <p className="text-sm text-neutral-500 mt-0.5">Comprehensive financial metrics and breakdowns.</p>
        </div>
        <div className="flex items-center space-x-3">
          <Link 
            href="/dashboard/finance/expenses"
            className="inline-flex items-center justify-center rounded-sm bg-[#7e2562] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#681b50] transition-colors"
          >
            Manage Expenses
          </Link>
          <div className="w-40">
            <Dropdown
              value={days}
              onChange={(val) => setDays(val)}
              options={[
                { value: '7', label: 'Last 7 Days' },
                { value: '30', label: 'Last 30 Days' },
              ]}
              selectClassName="!py-2 !rounded-sm border-[#7e2562]/20"
            />
          </div>
        </div>
      </div>

      {/* Top level metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="MTD Revenue" 
          value={`₹${(dashboardData?.mtdRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
          icon={TrendingUp} 
          color="emerald" 
        />
        <StatCard 
          title="MTD Expenses" 
          value={`₹${(dashboardData?.mtdExpense || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
          icon={TrendingDown} 
          color="amber" 
        />
        <StatCard 
          title="MTD Profit" 
          value={`₹${(dashboardData?.mtdProfit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
          icon={DollarSign} 
          color={dashboardData?.mtdProfit >= 0 ? 'emerald' : 'rose'} 
        />
        <StatCard 
          title="Cash Discrepancies" 
          value={dashboardData?.discrepancies || 0} 
          icon={AlertCircle} 
          color={dashboardData?.discrepancies > 0 ? 'rose' : 'plum'} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* P&L Trend Chart */}
        <div className="bg-white p-5 rounded-sm border border-neutral-200/80 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#7e2562] mb-4">Profit & Loss Trend</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dashboardData?.trendData || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(val) => {
                    const date = new Date(val);
                    return `${date.getMonth() + 1}/${date.getDate()}`;
                  }}
                  stroke="#9ca3af"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="#9ca3af" 
                  fontSize={11} 
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `₹${val}`}
                />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '4px', border: '1px solid #faedf5', boxShadow: '0 4px 12px rgba(126, 37, 98, 0.08)' }}
                  formatter={(value: any) => [`₹${Number(value).toFixed(2)}`]}
                />
                <Legend />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#3cb976" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
                <Area type="monotone" dataKey="expense" name="Expense" stroke="#e45e34" strokeWidth={2} fillOpacity={1} fill="url(#colorExp)" />
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3cb976" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#3cb976" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e45e34" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#e45e34" stopOpacity={0}/>
                  </linearGradient>
                </defs>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Branch Comparison Chart */}
        <div className="bg-white p-5 rounded-sm border border-neutral-200/80 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#7e2562] mb-4">Branch Comparison</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branchData || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                  dataKey="branchName" 
                  stroke="#9ca3af"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="#9ca3af" 
                  fontSize={11} 
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `₹${val}`}
                />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '4px', border: '1px solid #faedf5', boxShadow: '0 4px 12px rgba(126, 37, 98, 0.08)' }}
                  formatter={(value: any) => [`₹${Number(value).toFixed(2)}`]}
                />
                <Legend />
                <Bar dataKey="revenue" name="Revenue" fill="#7e2562" radius={[2, 2, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#e45e34" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Expenses Table */}
      <div className="bg-white rounded-sm border border-neutral-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-100 bg-[#faf6f9]/50 flex justify-between items-center">
          <h3 className="text-sm font-bold text-neutral-900">Recent Expenses</h3>
          <Link href="/dashboard/finance/expenses" className="text-xs text-[#7e2562] font-semibold hover:underline cursor-pointer">View All</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-600">
            <thead className="bg-[#faf6f9]/70 text-[11px] font-bold text-[#7e2562] uppercase tracking-wider border-b border-[#7e2562]/10 whitespace-nowrap">
              <tr>
                <th scope="col" className="px-6 py-3.5">Date</th>
                <th scope="col" className="px-6 py-3.5">Category</th>
                <th scope="col" className="px-6 py-3.5">Description</th>
                <th scope="col" className="px-6 py-3.5">Branch</th>
                <th scope="col" className="px-6 py-3.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {recentExpenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-neutral-400 font-medium">
                    No recent expenses found.
                  </td>
                </tr>
              ) : (
                recentExpenses.map((expense: any) => (
                  <tr key={expense.id} className="hover:bg-[#faf6f9]/40 transition-colors">
                    <td className="px-6 py-3.5 whitespace-nowrap text-sm text-neutral-500">
                      {new Date(expense.expenseDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <span className="bg-[#faedf5] text-[#7e2562] text-[11px] font-bold px-2.5 py-1 rounded-sm border border-[#7e2562]/20">
                        {expense.category}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 font-medium text-neutral-900">
                      {expense.description}
                    </td>
                    <td className="px-6 py-3.5 text-neutral-600">
                      {expense.branch?.name || 'HQ / General'}
                    </td>
                    <td className="px-6 py-3.5 text-right font-bold text-neutral-900">
                      ₹{Number(expense.amount).toFixed(2)}
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
