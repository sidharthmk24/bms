"use client";

import { useApiData } from '@/hooks/useApiData';
import { StatCard } from '@/components/StatCard';
import { Store, Users, DollarSign, StoreIcon, Loader2 } from 'lucide-react';
import { Dropdown } from '@/components/Dropdown';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-[#7e2562]/20 shadow-md rounded-sm z-50">
        <p className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wider">
          {new Date(label).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
        </p>
        <div className="space-y-1">
          <p className="text-sm font-bold text-[#7e2562]">
            Profit : ₹{(payload.find((p: any) => p.dataKey === 'profit')?.value || 0).toFixed(2)}
          </p>
        </div>
      </div>
    );
  }
  return null;
};

export default function SuperAdminDashboard() {
  const { data, loading, error } = useApiData<any>('/dashboard/super-admin');
  const { data: branchesResponse } = useApiData<any>('/branches', []);
  const branches = branchesResponse?.items || (Array.isArray(branchesResponse) ? branchesResponse : []);

  const [selectedBranchId, setSelectedBranchId] = useState('all');
  const [trendDays, setTrendDays] = useState('30');
  const [trendData, setTrendData] = useState<any[]>([]);
  const [trendLoading, setTrendLoading] = useState(false);

  useEffect(() => {
    if (selectedBranchId) {
      setTrendLoading(true);
      const url = selectedBranchId === 'all' 
        ? `/dashboard/super-admin/combined-trend?days=${trendDays}`
        : `/dashboard/super-admin/branch-trend/${selectedBranchId}?days=${trendDays}`;
        
      api.get(url)
        .then(res => {
          if (res.success && res.data) {
            setTrendData(res.data.trendData || []);
          }
        })
        .catch(console.error)
        .finally(() => setTrendLoading(false));
    } else {
      setTrendData([]);
    }
  }, [selectedBranchId, trendDays]);

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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Super Admin Overview</h2>
          <p className="text-sm text-gray-500">Chain-wide macro statistics across all branches.</p>
        </div>
        <div className="w-64">
          <Dropdown
            value={selectedBranchId}
            onChange={(val) => setSelectedBranchId(val)}
            placeholder="Select a branch to view trend..."
            options={[
              { value: 'all', label: 'All Branches (Combined)' },
              ...branches.filter((b: any) => b.isActive !== false).map((b: any) => ({ value: b.id, label: `${b.name} (${b.code})` }))
            ]}
          />
        </div>
      </div>

      {selectedBranchId && (
        <div className="bg-white p-6 rounded-sm shadow-xs border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-base font-bold text-gray-800">Branch Performance</h3>
            <div className="w-40">
              <Dropdown
                value={trendDays}
                onChange={(val) => setTrendDays(val)}
                options={[
                  { value: '7', label: 'Last 7 Days' },
                  { value: '30', label: 'Last 30 Days' },
                ]}
              />
            </div>
          </div>
          {trendLoading ? (
            <div className="h-[300px] w-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#7e2562]" />
            </div>
          ) : (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={trendData}
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
                    name="Profit"
                    stroke="#7e2562" 
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6, fill: "#7e2562", stroke: "#fff", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Total Revenue" 
          value={`₹${(data?.totalRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`} 
          icon={DollarSign} 
          color="green" 
        />
        <StatCard 
          title="Active Branches" 
          value={data?.branchCount || 0} 
          icon={Store} 
          color="blue" 
        />
        <StatCard 
          title="Active Users" 
          value={data?.activeUsersCount || 0} 
          icon={Users} 
          color="purple" 
        />
        <StatCard 
          title="Active Exhibitions" 
          value={data?.activeExhibitions || 0} 
          icon={StoreIcon} 
          color="amber" 
        />
      </div>
    </div>
  );
}
