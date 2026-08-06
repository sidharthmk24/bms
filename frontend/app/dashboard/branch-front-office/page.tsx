
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
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 bg-red-50 p-4 rounded-lg">Error: {error}</div>;
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
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            New Bill
          </Link>
          <Link 
            href="/dashboard/enquiries"
            className="inline-flex items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            Log Enquiry
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
        <StatCard 
          title="Enquiries Today" 
          value={data?.enquiriesToday || 0} 
          icon={MessageCircle} 
          color="blue" 
        />
      </div>
    </div>
  );
}
