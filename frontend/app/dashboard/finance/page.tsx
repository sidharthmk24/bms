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
  const { data: branchData, loading: branchLoading } = useApiData<any>(`/finance/branch-comparison?startDate=${startDateStr}&endDate=${endDateStr}`);
  const { data: expensesData, loading: expensesLoading } = useApiData<any>('/finance/expenses');

  const loading = dashLoading || branchLoading || expensesLoading;
  const error = dashError;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 bg-red-50 p-4 rounded-lg">Error: {error}</div>;
  }

  // Slice to get top 5 expenses for the table
  const recentExpenses = Array.isArray(expensesData) ? expensesData.slice(0, 5) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Finance Overview</h2>
          <p className="text-sm text-gray-500">Comprehensive financial metrics and breakdowns.</p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <Link 
            href="/dashboard/finance/expenses"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
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
            />
          </div>
        </div>
      </div>

      {/* Top level metrics */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="MTD Revenue" 
          value={`₹${(dashboardData?.mtdRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`} 
          icon={TrendingUp} 
          color="green" 
        />
        <StatCard 
          title="MTD Expenses" 
          value={`₹${(dashboardData?.mtdExpense || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`} 
          icon={TrendingDown} 
          color="amber" 
        />
        <StatCard 
          title="MTD Profit" 
          value={`₹${(dashboardData?.mtdProfit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`} 
          icon={DollarSign} 
          color={dashboardData?.mtdProfit >= 0 ? 'green' : 'red'} 
        />
        <StatCard 
          title="Cash Discrepancies" 
          value={dashboardData?.discrepancies || 0} 
          icon={AlertCircle} 
          color={dashboardData?.discrepancies > 0 ? 'red' : 'blue'} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* P&L Trend Chart */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Profit & Loss Trend</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dashboardData?.trendData || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(val) => {
                    const date = new Date(val);
                    return `${date.getMonth() + 1}/${date.getDate()}`;
                  }}
                  stroke="#9ca3af"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="#9ca3af" 
                  fontSize={12} 
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `₹${val}`}
                />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [`₹${value.toFixed(2)}`]}
                />
                <Legend />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" fillOpacity={1} fill="url(#colorRev)" />
                <Area type="monotone" dataKey="expense" name="Expense" stroke="#f59e0b" fillOpacity={1} fill="url(#colorExp)" />
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Branch Comparison Chart */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Branch Comparison</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branchData || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis 
                  dataKey="branchName" 
                  stroke="#9ca3af"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="#9ca3af" 
                  fontSize={12} 
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `₹${val}`}
                />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [`₹${value.toFixed(2)}`]}
                />
                <Legend />
                <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Expenses Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900">Recent Expenses</h3>
          <span className="text-sm text-blue-600 font-medium hover:underline cursor-pointer">View All</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
              <tr>
                <th scope="col" className="px-6 py-3">Date</th>
                <th scope="col" className="px-6 py-3">Category</th>
                <th scope="col" className="px-6 py-3">Description</th>
                <th scope="col" className="px-6 py-3">Branch</th>
                <th scope="col" className="px-6 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {recentExpenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No recent expenses found.
                  </td>
                </tr>
              ) : (
                recentExpenses.map((expense: any) => (
                  <tr key={expense.id} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(expense.expenseDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded border border-gray-200">
                        {expense.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {expense.description}
                    </td>
                    <td className="px-6 py-4">
                      {expense.branch?.name || 'HQ / General'}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-gray-900">
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
