"use client";

import { useApiData } from '@/hooks/useApiData';
import { StatCard } from '@/components/StatCard';
import { Store, TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { useState } from 'react';
import { Dropdown } from '@/components/Dropdown';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-[#7e2562]/20 shadow-md rounded-sm">
        <p className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wider">
          {new Date(label).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
        </p>
        <p className="text-sm font-bold text-[#7e2562]">
          Profit : ₹{payload[0].value.toFixed(2)}
        </p>
      </div>
    );
  }
  return null;
};

export default function BranchManagerDashboard() {
  const [days, setDays] = useState('30');
  const { data, loading, error } = useApiData<any>(`/dashboard/branch-manager?days=${days}`);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#7e2562]" />
      </div>
    );
  }

  if (error) {
    return <div className="text-[#e45e34] bg-[#fef5f2] p-4 rounded-sm border border-[#e45e34]/20 font-medium">Error: {error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Branch Manager Overview</h2>
          <p className="text-sm text-gray-500">Your branch's performance and pending tasks.</p>
        </div>
        <div className="mt-4 sm:mt-0 w-40">
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

      {data?.trendData && data.trendData.length > 0 && (
        <div className="bg-white p-6 rounded-sm shadow-xs border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-base font-bold text-gray-800">Profit Trend</h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data.trendData}
                margin={{ top: 10, right: 30, left: -20, bottom: 0 }}
              >
                <XAxis 
                  dataKey="date" 
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => {
                    const date = new Date(val);
                    return `${date.getDate()} ${date.toLocaleString('en-US', { month: 'short' })}`;
                  }}
                  stroke="#9ca3af"
                  fontSize={12}
                  tickMargin={10}
                  minTickGap={30}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  stroke="#9ca3af"
                  fontSize={12}
                  tickCount={5}
                />
                <Tooltip 
                  content={<CustomTooltip />}
                  cursor={{ stroke: '#faedf5', strokeWidth: 2 }}
                />
                <ReferenceLine y={0} stroke="#f3e8f0" />
                <Line 
                  type="monotone" 
                  dataKey="profit" 
                  stroke="#7e2562" 
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 6, fill: "#7e2562", stroke: "#fff", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="MTD Revenue" 
          value={`₹${(data?.mtdRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`} 
          icon={TrendingUp} 
          color="green" 
        />
        <StatCard 
          title="MTD Expenses" 
          value={`₹${(data?.mtdExpense || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`} 
          icon={TrendingDown} 
          color="amber" 
        />
        <StatCard 
          title="Low Stock Items" 
          value={data?.lowStockCount || 0} 
          icon={AlertTriangle} 
          color={data?.lowStockCount > 0 ? 'red' : 'green'} 
        />
        <StatCard 
          title="Pending Restocks" 
          value={data?.pendingRestocks || 0} 
          icon={Store} 
          color="blue" 
        />
      </div>
    </div>
  );
}
