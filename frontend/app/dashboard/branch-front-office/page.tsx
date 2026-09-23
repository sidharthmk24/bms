"use client";

import { useApiData } from '@/hooks/useApiData';
import { StatCard } from '@/components/StatCard';
import { 
  ShoppingBag, 
  Banknote, 
  CreditCard, 
  MessageSquare, 
  Loader2, 
  Plus, 
  ArrowRight,
  Receipt,
  UserCheck,
  CheckCircle2
} from 'lucide-react';
import Link from 'next/link';

interface TransactionSummary {
  id: string;
  billNumber: string;
  customerName?: string;
  totalAmount: number;
  paymentMode?: string;
  paymentStatus?: string;
  createdAt: string;
}

interface CustomerEnquirySummary {
  id: string;
  customerName?: string;
  customerPhone?: string;
  bookTitle?: string;
  freeTextTitle?: string;
  createdAt: string;
}

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
    return (
      <div className="text-[#e45e34] bg-[#fef5f2] p-4 rounded-xl border border-[#e45e34]/20 font-medium text-sm">
        Error loading Front Office dashboard: {error}
      </div>
    );
  }

  const transactions: TransactionSummary[] = data?.recentTransactionsList || [];
  const enquiries: CustomerEnquirySummary[] = data?.openEnquiriesList || [];

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Front Desk Point of Sale</h2>
          <p className="text-sm text-gray-500">Today&apos;s counter sales activity, customer enquiries, and billing operations.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link 
            href="/dashboard/billing"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#7e2562] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#681b50] transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>New Bill (POS)</span>
          </Link>
          <Link 
            href="/dashboard/enquiries"
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 shadow-2xs hover:bg-gray-50 transition-colors"
          >
            <MessageSquare className="h-4 w-4 text-gray-500" />
            <span>Customer Enquiry</span>
          </Link>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Today's Total Sales" 
          value={`₹${(data?.todaySales || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
          icon={ShoppingBag} 
          color="green" 
        />
        <StatCard 
          title="Cash Collected Today" 
          value={`₹${(data?.cashSales || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
          icon={Banknote} 
          color="amber" 
        />
        <StatCard 
          title="UPI Payments Today" 
          value={`₹${(data?.upiSales || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
          icon={CreditCard} 
          color="purple" 
        />
        <StatCard 
          title="Bills & Enquiries Today" 
          value={`${data?.todayBillCount || 0} Bills (${data?.enquiriesToday || 0} Enq)`} 
          icon={Receipt} 
          color="blue" 
        />
      </div>

      {/* Main Content Layout — 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Spans): Today's Counter Transactions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-[#7e2562]" />
                  <span>Today&apos;s Billing Transactions</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Counter sales generated today across cash and digital modes.</p>
              </div>
              <Link href="/dashboard/billing" className="text-xs font-bold text-[#7e2562] hover:underline inline-flex items-center gap-1">
                <span>Open POS Counter</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {transactions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-6 text-center">
                <ShoppingBag className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p className="text-xs font-bold text-gray-900">No Sales Recorded Today Yet</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Click &ldquo;New Bill (POS)&rdquo; above to start billing customers.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-gray-100 bg-gray-50/70 text-gray-500 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Bill No.</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Payment Mode</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-gray-900">
                          {tx.billNumber}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {tx.customerName || 'Walk-in Customer'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                            tx.paymentMode === 'CASH' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            tx.paymentMode === 'UPI' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                            'bg-gray-100 text-gray-700 border-gray-200'
                          }`}>
                            {tx.paymentMode || 'PAID'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-black text-gray-900">
                          ₹{(tx.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 Span): Open Customer Book Enquiries */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-amber-600" />
                <span>Open Customer Enquiries</span>
              </h3>
              <Link href="/dashboard/enquiries" className="text-xs font-bold text-[#7e2562] hover:underline">
                View All
              </Link>
            </div>

            {enquiries.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-4 text-center">
                <CheckCircle2 className="mx-auto h-6 w-6 text-emerald-500 mb-1" />
                <p className="text-xs font-bold text-gray-900">No Open Customer Enquiries</p>
                <p className="text-[11px] text-gray-500 mt-0.5">All customer book requests are satisfied.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {enquiries.map((enq) => (
                  <div key={enq.id} className="rounded-xl border border-gray-100 bg-gray-50/50 p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-gray-900 truncate max-w-[170px]" title={enq.bookTitle || enq.freeTextTitle || 'Book Title'}>
                        {enq.bookTitle || enq.freeTextTitle || 'Untitled Book'}
                      </p>
                      <span className="rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 text-[9px] font-bold">
                        OPEN
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-gray-500">
                      <span>Customer: <strong>{enq.customerName || 'Walk-in'}</strong></span>
                      <span>{enq.customerPhone || 'No Phone'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
