
"use client";

import { useApiData } from '@/hooks/useApiData';
import { StatCard } from '@/components/StatCard';
import { ShoppingBag, Banknote, CreditCard, AlertCircle, MessageCircle } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function BranchFrontOfficeDashboard() {
  const { data, loading, error } = useApiData<any>('/dashboard/branch-front-office');

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
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Front Desk Point of Sale</h2>
          <p className="text-sm text-gray-500">Today's sales activity and counter operations.</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <Link 
            href="/dashboard/billing"
            className="inline-flex items-center justify-center rounded-sm bg-[#7e2562] px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-[#681b50] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7e2562]"
          >
            New Bill
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Today's Sales" 
          value={`₹${(data?.todaySales || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`} 
          icon={ShoppingBag} 
          color="green" 
        />
        <StatCard 
          title="Cash Today" 
          value={`₹${(data?.cashSales || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`} 
          icon={Banknote} 
          color="amber" 
        />
        <StatCard 
          title="UPI Today" 
          value={`₹${(data?.upiSales || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`} 
          icon={CreditCard} 
          color="purple" 
        />
      </div>
    </div>
  );
}
