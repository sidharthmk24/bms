"use client";

import { useApiData } from '@/hooks/useApiData';
import { StatCard } from '@/components/StatCard';
import { 
  AlertTriangle, 
  Package, 
  ShoppingCart, 
  BookOpen, 
  Loader2, 
  Plus, 
  ArrowRight,
  TrendingDown,
  Building2,
  CheckCircle2
} from 'lucide-react';
import Link from 'next/link';

interface LowStockItem {
  title: string;
  isbn: string;
  quantity: number;
  reorderThreshold: number;
}

interface PurchaseOrderSummary {
  id: string;
  orderNumber: string;
  supplierName?: string;
  status: string;
  totalCost: number;
  createdAt: string;
}

interface RestockRequestSummary {
  id: string;
  requestNumber: string;
  branchName?: string;
  status: string;
  createdAt: string;
}

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
    return (
      <div className="text-[#e45e34] bg-[#fef5f2] p-4 rounded-xl border border-[#e45e34]/20 font-medium text-sm">
        Error loading Central Inventory dashboard: {error}
      </div>
    );
  }

  const lowStockItems: LowStockItem[] = data?.lowStockItemsList || [];
  const purchaseOrders: PurchaseOrderSummary[] = data?.recentPurchaseOrdersList || [];
  const restockRequests: RestockRequestSummary[] = data?.pendingRestockRequestsList || [];

  return (
    <div className="space-y-6">
      {/* Header & Quick Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Central Inventory</h2>
          <p className="text-sm text-gray-500">Warehouse stock monitoring, supply chain, and fulfillment control.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/dashboard/purchase-orders"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#7e2562] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#681b50] transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Create Purchase Order</span>
          </Link>
          <Link
            href="/dashboard/restock"
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 shadow-2xs hover:bg-gray-50 transition-all"
          >
            <Package className="h-4 w-4 text-gray-500" />
            <span>Branch Restocks</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Low Stock Items" 
          value={data?.lowStockCount || 0} 
          icon={AlertTriangle} 
          color={data?.lowStockCount > 0 ? 'red' : 'green'} 
        />
        <StatCard 
          title="Pending Branch Restocks" 
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
          title="Central Warehouse Units" 
          value={(data?.totalCentralStockUnits || 0).toLocaleString('en-IN')} 
          icon={BookOpen} 
          color="purple" 
        />
      </div>

      {/* Main Content Layout — 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Spans): Central Stock Low Stock Alerts */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-[#e45e34]" />
                  <span>Central Stock Low Stock Alerts</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Book titles requiring reorder or PMS print job creation.</p>
              </div>
              <Link
                href="/dashboard/central-stock"
                className="text-xs font-bold text-[#7e2562] hover:underline inline-flex items-center gap-1"
              >
                <span>View All Stock</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {lowStockItems.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-6 text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500 mb-2" />
                <p className="text-xs font-bold text-gray-900">All Central Stock Levels are Healthy</p>
                <p className="text-[11px] text-gray-500 mt-0.5">No titles are currently below their safety threshold.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-gray-100 bg-gray-50/70 text-gray-500 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Book Title</th>
                      <th className="px-4 py-3">ISBN</th>
                      <th className="px-4 py-3 text-center">Available Stock</th>
                      <th className="px-4 py-3 text-center">Reorder Threshold</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                    {lowStockItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-4 py-3 font-bold text-gray-900 max-w-xs truncate" title={item.title}>
                          {item.title}
                        </td>
                        <td className="px-4 py-3 font-mono text-gray-500 text-[11px]">
                          {item.isbn || '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700 border border-rose-200">
                            {item.quantity} Copies
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-500 font-semibold">
                          {item.reorderThreshold}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href="/dashboard/purchase-orders"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#7e2562] hover:underline"
                          >
                            <span>+ Order</span>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 Span): Active Purchase Orders & Pending Branch Restocks */}
        <div className="space-y-6">
          {/* Section 1: Recent Purchase Orders */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-blue-600" />
                <span>Recent Purchase Orders</span>
              </h3>
              <Link href="/dashboard/purchase-orders" className="text-xs font-bold text-[#7e2562] hover:underline">
                View All
              </Link>
            </div>

            {purchaseOrders.length === 0 ? (
              <p className="text-xs text-gray-500 py-3 text-center">No active purchase orders found.</p>
            ) : (
              <div className="space-y-2.5">
                {purchaseOrders.map((po) => (
                  <div key={po.id} className="rounded-xl border border-gray-100 bg-gray-50/50 p-3 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-mono font-bold text-gray-700">{po.orderNumber}</span>
                      <p className="text-xs font-semibold text-gray-900">{po.supplierName || 'Kairali Books / PMS'}</p>
                      <span className="text-[10px] text-gray-500">₹{(po.totalCost || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                      po.status === 'PLACED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      po.status === 'RECEIVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      'bg-gray-100 text-gray-700 border-gray-200'
                    }`}>
                      {po.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Pending Restocks from Branches */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-amber-600" />
                <span>Branch Restock Demands</span>
              </h3>
              <Link href="/dashboard/restock" className="text-xs font-bold text-[#7e2562] hover:underline">
                Manage
              </Link>
            </div>

            {restockRequests.length === 0 ? (
              <p className="text-xs text-gray-500 py-3 text-center">No pending branch restock demands.</p>
            ) : (
              <div className="space-y-2.5">
                {restockRequests.map((rr) => (
                  <div key={rr.id} className="rounded-xl border border-gray-100 bg-gray-50/50 p-3 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-mono font-bold text-gray-700">{rr.requestNumber}</span>
                      <p className="text-xs font-semibold text-gray-900">{rr.branchName || 'Branch Store'}</p>
                    </div>
                    <span className="rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 text-[10px] font-bold">
                      {rr.status}
                    </span>
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
