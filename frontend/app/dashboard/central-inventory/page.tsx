"use client";

import { useApiData } from '@/hooks/useApiData';
import { StatCard } from '@/components/StatCard';
import { AlertTriangle, Package, ShoppingCart, BookPlus } from 'lucide-react';
import { Loader2 } from 'lucide-react';

export default function CentralInventoryDashboard() {
  const { data, loading, error } = useApiData<any>('/dashboard/central-inventory');

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
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Central Inventory</h2>
        <p className="text-sm text-gray-500">Action items for warehouse stock and supply chain.</p>
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
          title="Active Purchase Orders" 
          value={data?.activePurchaseOrders || 0} 
          icon={ShoppingCart} 
          color="blue" 
        />
        <StatCard 
          title="Pending New Titles" 
          value={data?.pendingNewTitles || 0} 
          icon={BookPlus} 
          color="purple" 
        />
      </div>
    </div>
  );
}
