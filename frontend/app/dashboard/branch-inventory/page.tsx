"use client";

import { useApiData } from '@/hooks/useApiData';
import { StatCard } from '@/components/StatCard';
import { AlertTriangle, Package, ArchiveRestore, Send } from 'lucide-react';
import { Loader2 } from 'lucide-react';

export default function BranchInventoryDashboard() {
  const { data, loading, error } = useApiData<any>('/dashboard/branch-inventory');

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
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Branch Inventory</h2>
        <p className="text-sm text-gray-500">Your local branch stock alerts and logistics.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Low Stock Items" 
          value={data?.lowStockCount || 0} 
          icon={AlertTriangle} 
          color={data?.lowStockCount > 0 ? 'red' : 'green'} 
        />
        <StatCard 
          title="Pending Restocks" 
          value={data?.pendingRestocks || 0} 
          icon={Package} 
          color={data?.pendingRestocks > 0 ? 'amber' : 'blue'} 
        />
        <StatCard 
          title="Awaiting Receipt" 
          value={data?.awaitingReceipt || 0} 
          icon={ArchiveRestore} 
          color="purple" 
        />
        <StatCard 
          title="Exhibition Stock Out" 
          value={data?.exhibitionsOut || 0} 
          icon={Send} 
          color="blue" 
        />
      </div>
    </div>
  );
}
