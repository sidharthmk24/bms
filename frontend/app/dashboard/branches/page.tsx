"use client";

import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import { useApiData } from '@/hooks/useApiData';
import { api } from '@/lib/api';
import Link from 'next/link';
import {
  Loader2,
  Plus,
  Store,
  Warehouse,
  MapPin,
  Edit2,
  Sparkles,
  X,
  Users,
  Package,
  TrendingUp,
  AlertTriangle,
  Receipt,
  Truck,
  Eye,
  CheckCircle2,
  XCircle,
  BarChart3,
  Search,
  Filter,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Layers,
  ArrowUpRight,
  TrendingDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dropdown } from '@/components/Dropdown';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

type BranchType = 'STORE' | 'WAREHOUSE';

interface BranchStats {
  id: string;
  name: string;
  code: string;
  type: BranchType;
  city?: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
  staffCount?: number;
  managerName?: string | null;
  totalStockQty?: number;
  uniqueTitlesCount?: number;
  lowStockCount?: number;
  mtdRevenue?: number;
  todayRevenue?: number;
  todayBillsCount?: number;
}

const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-[#7e2562]/20 shadow-lg rounded-sm text-xs">
        <p className="text-neutral-500 font-bold mb-1   tracking-wider">
          {label}
        </p>
        <p className="text-sm font-extrabold text-[#7e2562]">
          Revenue: ₹{Number(payload[0].value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        {payload[1] && (
          <p className="text-xs font-semibold text-neutral-600 mt-0.5">
            Bills: {payload[1].value}
          </p>
        )}
      </div>
    );
  }
  return null;
};

export default function BranchesManagementPage() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const isSuperAdmin = user?.roles?.includes('SUPER_ADMIN') || user?.roles?.includes('ADMIN') || user?.role === 'SUPER_ADMIN' || user?.primaryRole === 'SUPER_ADMIN';
  const isCentralInventory = user?.roles?.includes('CENTRAL_INVENTORY_MANAGER') || user?.role === 'CENTRAL_INVENTORY_MANAGER' || user?.primaryRole === 'CENTRAL_INVENTORY_MANAGER';
  const isAuthorized = isSuperAdmin || isCentralInventory;

  // Fetch branches with aggregated live stats
  const { data: branchesResponse, loading, refetch } = useApiData<any>('/branches?withStats=true', []);
  const branchesList: BranchStats[] = branchesResponse?.data || branchesResponse || [];

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'STORE' | 'WAREHOUSE'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modal State - Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'STORE' as BranchType,
    city: '',
    address: '',
    isActive: true,
  });

  // Modal State - 360° Insights & Dashboard
  const [insightsBranchId, setInsightsBranchId] = useState<string | null>(null);
  const [insightsDays, setInsightsDays] = useState('30');
  const [insightsTab, setInsightsTab] = useState<'overview' | 'inventory' | 'staff' | 'activity'>('overview');
  const [insightsChartType, setInsightsChartType] = useState<'area' | 'bar'>('area');

  const {
    data: insightsDataResponse,
    loading: insightsLoading,
    refetch: refetchInsights,
  } = useApiData<any>(
    insightsBranchId ? `/branches/${insightsBranchId}/insights?days=${insightsDays}` : null,
    null
  );
  const insights = insightsDataResponse?.data || insightsDataResponse;

  const selectedBranch = useMemo(() => {
    return branchesList.find((b) => b.id === insightsBranchId) || null;
  }, [branchesList, insightsBranchId]);

  if (!isAuthorized) {
    return <div className="p-8 text-center text-red-600 font-bold">Access Denied. Authorized personnel only.</div>;
  }

  // Calculate Network Aggregates
  const networkStats = useMemo(() => {
    let storesCount = 0;
    let warehousesCount = 0;
    let totalStock = 0;
    let totalMtdRevenue = 0;
    let totalStaff = 0;

    branchesList.forEach((b) => {
      if (b.type === 'WAREHOUSE') warehousesCount++;
      else storesCount++;
      totalStock += Number(b.totalStockQty || 0);
      totalMtdRevenue += Number(b.mtdRevenue || 0);
      totalStaff += Number(b.staffCount || 0);
    });

    return {
      totalBranches: branchesList.length,
      storesCount,
      warehousesCount,
      totalStock,
      totalMtdRevenue,
      totalStaff,
    };
  }, [branchesList]);

  // Filtered branch list
  const filteredBranches = useMemo(() => {
    return branchesList.filter((b) => {
      const matchSearch =
        b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.city && b.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (b.address && b.address.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchType = typeFilter === 'ALL' || b.type === typeFilter;
      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && b.isActive !== false) ||
        (statusFilter === 'INACTIVE' && b.isActive === false);

      return matchSearch && matchType && matchStatus;
    });
  }, [branchesList, searchTerm, typeFilter, statusFilter]);

  const openModal = (branch?: any) => {
    setEditingBranch(branch || null);
    if (branch) {
      setFormData({
        name: branch.name,
        code: branch.code || '',
        type: branch.type || 'STORE',
        city: branch.city || '',
        address: branch.address || '',
        isActive: branch.isActive !== false,
      });
    } else {
      setFormData({ name: '', code: '', type: 'STORE', city: '', address: '', isActive: true });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await confirm({
      title: editingBranch ? 'Update Branch' : 'Create New Branch',
      message: editingBranch
        ? `Are you sure you want to update the details for "${formData.name}"?`
        : `Are you sure you want to create new branch "${formData.name}" (${formData.type})?`,
      confirmText: editingBranch ? 'Yes, Update' : 'Yes, Create Branch',
      cancelText: 'No, Cancel',
      variant: 'primary',
    });
    if (!ok) return;

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        code: formData.code,
        type: formData.type,
        city: formData.city,
        address: formData.address,
        isActive: formData.isActive,
      };

      if (editingBranch) {
        await api.patch(`/branches/${editingBranch.id}`, payload);
      } else {
        await api.post('/branches', payload);
      }
      setIsModalOpen(false);
      refetch();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Save failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFillDemoBranch = () => {
    const sampleBranches = [
      { name: 'Kozhikode Beach Road Branch', code: 'KKD-02', city: 'Kozhikode', address: 'Opposite Town Hall, Beach Road, Kozhikode, Kerala 673001' },
      { name: 'Ernakulam Marine Drive Store', code: 'EKM-03', city: 'Kochi', address: 'Shanmugham Road, Marine Drive, Kochi, Kerala 682031' },
      { name: 'Kottayam Central Depot', code: 'KTM-01', city: 'Kottayam', address: 'Baker Junction, MC Road, Kottayam, Kerala 686001' },
      { name: 'Thrissur Round South Store', code: 'TSR-02', city: 'Thrissur', address: 'Swaraj Round South, Thrissur, Kerala 680001' },
    ];
    const picked = sampleBranches[Math.floor(Math.random() * sampleBranches.length)];
    setFormData({
      name: picked.name,
      code: picked.code,
      city: picked.city,
      address: picked.address,
      type: 'STORE',
      isActive: true,
    });
  };

  const openInsightsModal = (branchId: string) => {
    setInsightsBranchId(branchId);
    setInsightsTab('overview');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-sm border border-[#7e2562]/15 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-sm bg-[#faedf5] text-[#7e2562] flex items-center justify-center font-bold">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-neutral-900">Branch & Location Management</h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Centralized multi-store overview, live branch telemetry, stock balances, and 360° operational dashboards.
              </p>
            </div>
          </div>
        </div>
        {isSuperAdmin && (
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 px-4 py-2 bg-[#7e2562] text-white rounded-sm text-xs font-bold   tracking-wider hover:bg-[#681b50] shadow-sm shadow-plum-sm transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" /> Register Branch
          </button>
        )}
      </div>

      {/* Network Snapshot Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-sm border border-[#7e2562]/15 shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-semibold">
            <span>Total Branches</span>
            <Store className="w-4 h-4 text-[#7e2562]" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-neutral-900">{networkStats.totalBranches}</div>
          <div className="mt-1 text-[11px] text-neutral-500">
            {networkStats.storesCount} Stores • {networkStats.warehousesCount} Warehouse
          </div>
        </div>

        <div className="bg-white p-4 rounded-sm border border-[#7e2562]/15 shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-semibold">
            <span>Network Stock</span>
            <Package className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-neutral-900">
            {networkStats.totalStock.toLocaleString('en-IN')}
          </div>
          <div className="mt-1 text-[11px] text-emerald-600 font-medium">Live In-Stock Units</div>
        </div>

        <div className="bg-white p-4 rounded-sm border border-[#7e2562]/15 shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-semibold">
            <span>Network MTD Sales</span>
            <TrendingUp className="w-4 h-4 text-[#7e2562]" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-[#7e2562]">
            ₹{networkStats.totalMtdRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="mt-1 text-[11px] text-neutral-500">Month-to-date retail revenue</div>
        </div>

        <div className="bg-white p-4 rounded-sm border border-[#7e2562]/15 shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-semibold">
            <span>Active Staff</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-neutral-900">{networkStats.totalStaff}</div>
          <div className="mt-1 text-[11px] text-neutral-500">Personnel across all units</div>
        </div>

        <div className="bg-white p-4 rounded-sm border border-[#7e2562]/15 shadow-2xs col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-semibold">
            <span>Warehouse Hubs</span>
            <Warehouse className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-neutral-900">{networkStats.warehousesCount}</div>
          <div className="mt-1 text-[11px] text-indigo-600 font-medium">Central Supply Hub</div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3.5 rounded-sm border border-[#7e2562]/15 shadow-2xs">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search branch by name, code, city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-[#7e2562] focus:border-[#7e2562]"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-36">
            <Dropdown
              value={typeFilter}
              onChange={(val: any) => setTypeFilter(val)}
              options={[
                { value: 'ALL', label: 'All Types' },
                { value: 'STORE', label: 'Stores Only' },
                { value: 'WAREHOUSE', label: 'Warehouses Only' },
              ]}
            />
          </div>

          <div className="w-36">
            <Dropdown
              value={statusFilter}
              onChange={(val: any) => setStatusFilter(val)}
              options={[
                { value: 'ALL', label: 'All Status' },
                { value: 'ACTIVE', label: 'Active Only' },
                { value: 'INACTIVE', label: 'Inactive Only' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Branches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-16 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-[#7e2562]" />
            <span className="text-xs font-semibold text-neutral-500">Loading branch networks and live metrics...</span>
          </div>
        ) : filteredBranches.length === 0 ? (
          <div className="col-span-full bg-white rounded-sm border border-neutral-200 p-12 text-center text-neutral-500 text-sm">
            <Store className="w-10 h-10 mx-auto text-neutral-300 mb-2" />
            <p className="font-semibold text-neutral-700">No branches found matching the criteria.</p>
            <p className="text-xs text-neutral-500 mt-1">Try resetting search filters or register a new branch.</p>
          </div>
        ) : (
          filteredBranches.map((b) => {
            const isWarehouse = b.type === 'WAREHOUSE';
            const isActive = b.isActive !== false;

            return (
              <div
                key={b.id}
                className="bg-white rounded-sm shadow-2xs border border-[#7e2562]/15 overflow-hidden hover:border-[#7e2562]/40 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Card Header */}
                  <div className="p-4 border-b border-neutral-100 flex items-start justify-between bg-gradient-to-r from-[#faf6f9] to-white">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-11 h-11 rounded-sm text-white flex items-center justify-center font-bold text-xs shadow-2xs ${
                          isWarehouse ? 'bg-indigo-700' : 'bg-[#7e2562]'
                        }`}
                      >
                        {isWarehouse ? <Warehouse className="w-5 h-5" /> : b.code?.substring(0, 3) || 'LOC'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-neutral-900 line-clamp-1">{b.name}</h3>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] font-mono font-bold text-[#7e2562] bg-[#faedf5] px-1.5 py-0.5 rounded-sm">
                            {b.code}
                          </span>
                          <span
                            className={`text-[10px] font-bold   tracking-wider px-2 py-0.5 rounded-sm ${
                              isWarehouse
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-[#faedf5] text-[#7e2562]'
                            }`}
                          >
                            {b.type}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-extrabold   px-2.5 py-0.5 rounded-full ${
                          isActive
                            ? 'bg-[#eaf8f1] text-[#3cb976] border border-[#3cb976]/30'
                            : 'bg-[#fef2f2] text-[#e45e34] border border-[#e45e34]/30'
                        }`}
                      >
                        {isActive ? 'Active' : 'Inactive'}
                      </span>

                      {isSuperAdmin && (
                        <button
                          onClick={() => openModal(b)}
                          className="p-1.5 text-neutral-400 hover:text-[#7e2562] hover:bg-[#faedf5] rounded-sm transition-colors cursor-pointer"
                          title="Edit Branch Information"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Location & Address */}
                  <div className="px-4 py-2.5 bg-neutral-50/70 border-b border-neutral-100 text-xs flex items-center gap-1.5 text-neutral-600">
                    <MapPin className="w-3.5 h-3.5 text-[#7e2562] flex-shrink-0" />
                    <span className="truncate font-medium">
                      {b.city ? `${b.city} — ` : ''}
                      {b.address || 'Address not specified'}
                    </span>
                  </div>

                  {/* Card Telemetry / Live Metrics */}
                  <div className="p-4 space-y-3">
                    {/* Metric 1: Stock Inventory */}
                    <div className="flex items-center justify-between p-2.5 bg-neutral-50 rounded-sm border border-neutral-100">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-sm bg-emerald-50 text-emerald-700 flex items-center justify-center">
                          <Package className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-[10px]   font-bold text-neutral-400">In Stock</div>
                          <div className="text-xs font-bold text-neutral-900">
                            {(b.totalStockQty || 0).toLocaleString('en-IN')} units
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[10px]   font-bold text-neutral-400">Titles</div>
                        <div className="text-xs font-semibold text-neutral-700">
                          {b.uniqueTitlesCount || 0} unique
                        </div>
                      </div>
                    </div>

                    {/* Metric 2: Low Stock Warning (if any) */}
                    {/* {(b.lowStockCount || 0) > 0 && (
                      <div className="flex items-center justify-between px-2.5 py-1.5 bg-[#fef5f2] border border-[#e45e34]/20 rounded-sm text-[11px] text-[#e45e34] font-medium">
                        <span className="flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                          Low Stock Items:
                        </span>
                        <span className="font-bold bg-[#e45e34] text-white px-1.5 py-0.2 rounded-sm text-[10px]">
                          {b.lowStockCount} items
                        </span>
                      </div>
                    )} */}

                    {/* Metric 3: Staff & Manager */}
                    <div className="flex items-center justify-between text-xs text-neutral-600 pt-1 border-t border-neutral-100">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-neutral-400" />
                        <span className="font-semibold text-neutral-800">{b.staffCount || 0} Staff</span>
                      </div>
                      <div className="text-[11px] text-neutral-500 truncate max-w-[140px]">
                        {b.managerName ? `Mgr: ${b.managerName}` : 'No manager set'}
                      </div>
                    </div>

                    {/* Metric 4: Revenue for Store */}
                    {!isWarehouse && (
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-100">
                        <div className="bg-[#faf6f9] p-2 rounded-sm border border-[#7e2562]/10">
                          <span className="text-[10px] text-[#7e2562] font-semibold block">Today's Sales</span>
                          <span className="text-xs font-bold text-neutral-900">
                            ₹{(b.todayRevenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                        <div className="bg-[#faf6f9] p-2 rounded-sm border border-[#7e2562]/10">
                          <span className="text-[10px] text-[#7e2562] font-semibold block">MTD Revenue</span>
                          <span className="text-xs font-bold text-[#7e2562]">
                            ₹{(b.mtdRevenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="p-3 bg-[#faf6f9]/60 border-t border-[#7e2562]/15 flex items-center gap-2">
                  <button
                    onClick={() => openInsightsModal(b.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#7e2562] text-white rounded-sm text-xs font-bold hover:bg-[#681b50] shadow-xs shadow-plum-sm transition-all cursor-pointer active:scale-95"
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>360° Insights & Dashboard</span>
                  </button>

                  <Link
                    href={isWarehouse ? '/dashboard/central-stock' : `/dashboard/inventory?branchId=${b.id}`}
                    className="flex items-center justify-center p-2 bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-200 rounded-sm text-xs font-semibold transition-colors"
                    title={`Open ${b.name} Inventory`}
                  >
                    <Package className="w-3.5 h-3.5 text-neutral-600" />
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 360° BRANCH INSIGHTS & DASHBOARD MODAL */}
      <AnimatePresence>
        {insightsBranchId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-sm shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col border border-[#7e2562]/25 overflow-hidden my-auto"
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 bg-gradient-to-r from-[#7e2562] to-[#591644] text-white flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-sm bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center font-bold text-base shadow-sm">
                    {(insights?.branch?.type || selectedBranch?.type) === 'WAREHOUSE' ? <Warehouse className="w-6 h-6" /> : <Store className="w-6 h-6" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-lg sm:text-xl font-extrabold tracking-tight">
                        {insights?.branch?.name || selectedBranch?.name || 'Branch Telemetry'}
                      </h3>
                      <span className="text-[11px] font-mono font-bold bg-white/20 px-2 py-0.5 rounded-sm">
                        {insights?.branch?.code || selectedBranch?.code}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-white/80 mt-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-white/70" />
                        {insights?.branch?.city || selectedBranch?.city || 'City N/A'}
                      </span>
                      <span>•</span>
                      <span className="font-semibold   tracking-wider">
                        {insights?.branch?.type || selectedBranch?.type || 'STORE'}
                      </span>
                      <span>•</span>
                      <span className="text-white/70">
                        Created: {(insights?.branch?.createdAt || selectedBranch?.createdAt) ? new Date(insights?.branch?.createdAt || selectedBranch!.createdAt).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Days Selector */}
                  <div className="hidden sm:flex items-center bg-white/10 rounded-sm p-0.5 border border-white/20 text-xs">
                    {['7', '30', '90'].map((d) => (
                      <button
                        key={d}
                        onClick={() => setInsightsDays(d)}
                        className={`px-2.5 py-1 rounded-sm font-semibold transition-all cursor-pointer ${
                          insightsDays === d ? 'bg-white text-[#7e2562] shadow-2xs' : 'text-white/80 hover:text-white'
                        }`}
                      >
                        {d} Days
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setInsightsBranchId(null)}
                    className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-sm transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center border-b border-neutral-200 bg-[#faf6f9] px-4 sm:px-6 gap-2 sm:gap-4 overflow-x-auto">
                <button
                  onClick={() => setInsightsTab('overview')}
                  className={`flex items-center gap-2 py-3 px-2 text-xs font-bold   tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                    insightsTab === 'overview'
                      ? 'border-[#7e2562] text-[#7e2562]'
                      : 'border-transparent text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  Overview & Sales
                </button>

                <button
                  onClick={() => setInsightsTab('inventory')}
                  className={`flex items-center gap-2 py-3 px-2 text-xs font-bold   tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                    insightsTab === 'inventory'
                      ? 'border-[#7e2562] text-[#7e2562]'
                      : 'border-transparent text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  Inventory Health ({insights?.inventory?.totalStockQty?.toLocaleString('en-IN') || 0})
                </button>

                <button
                  onClick={() => setInsightsTab('staff')}
                  className={`flex items-center gap-2 py-3 px-2 text-xs font-bold   tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                    insightsTab === 'staff'
                      ? 'border-[#7e2562] text-[#7e2562]'
                      : 'border-transparent text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  Staff Team ({insights?.staff?.length || 0})
                </button>

                {/* <button
                  onClick={() => setInsightsTab('activity')}
                  className={`flex items-center gap-2 py-3 px-2 text-xs font-bold   tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                    insightsTab === 'activity'
                      ? 'border-[#7e2562] text-[#7e2562]'
                      : 'border-transparent text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  <Receipt className="w-4 h-4" />
                  Recent Activity & Transfers
                </button> */}
              </div>

              {/* Modal Body */}
              <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
                {insightsLoading ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-[#7e2562]" />
                    <span className="text-xs font-semibold text-neutral-500">
                      Loading comprehensive branch telemetry...
                    </span>
                  </div>
                ) : (
                  <>
                    {/* TAB 1: OVERVIEW & SALES */}
                    {insightsTab === 'overview' && (
                      <div className="space-y-6">
                        {/* Financial Stat Cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                          <div className="p-4 bg-white rounded-sm border border-[#7e2562]/20 shadow-2xs">
                            <span className="text-[10px]  font-bold text-neutral-400">MTD Sales Revenue</span>
                            <div className="text-xl sm:text-2xl font-black text-[#7e2562] mt-1">
                              ₹{(insights?.financials?.mtdRevenue || 0).toLocaleString('en-IN', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </div>
                            <span className="text-[10px] text-neutral-500 mt-1 block">Completed sales this month</span>
                          </div>

                          <div className="p-4 bg-white rounded-sm border border-[#7e2562]/20 shadow-2xs">
                            <span className="text-[10px]   font-bold text-neutral-400">Est. Net Profit</span>
                            <div
                              className={`text-xl sm:text-2xl font-black mt-1 ${
                                (insights?.financials?.mtdProfit || 0) >= 0 ? 'text-[#3cb976]' : 'text-[#e45e34]'
                              }`}
                            >
                              ₹{(insights?.financials?.mtdProfit || 0).toLocaleString('en-IN', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </div>
                            <span className="text-[10px] text-neutral-500 mt-1 block">After COGS & branch expenses</span>
                          </div>

                          <div className="p-4 bg-white rounded-sm border border-[#7e2562]/20 shadow-2xs">
                            <span className="text-[10px]   font-bold text-neutral-400">Today's Sales</span>
                            <div className="text-xl sm:text-2xl font-black text-neutral-900 mt-1">
                              ₹{(insights?.financials?.todayRevenue || 0).toLocaleString('en-IN', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </div>
                            <span className="text-[10px] text-neutral-500 mt-1 block">
                              {insights?.financials?.todayBillsCount || 0} bills generated today
                            </span>
                          </div>

                          <div className="p-4 bg-white rounded-sm border border-[#7e2562]/20 shadow-2xs">
                            <span className="text-[10px]   font-bold text-neutral-400">Avg. Bill Value</span>
                            <div className="text-xl sm:text-2xl font-black text-neutral-900 mt-1">
                              ₹{(insights?.financials?.avgBillValue || 0).toLocaleString('en-IN', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </div>
                            <span className="text-[10px] text-neutral-500 mt-1 block">
                              From {insights?.financials?.totalBillsCount || 0} lifetime bills
                            </span>
                          </div>
                        </div>

                        {/* Revenue & Transaction Trend Chart */}
                        <div className="bg-white p-5 rounded-sm border border-[#7e2562]/20 shadow-2xs">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 pb-3 border-b border-neutral-100">
                            <div>
                              <h4 className="text-sm font-bold text-neutral-900">
                                Sales Revenue Trend (Last {insightsDays} Days)
                              </h4>
                              <p className="text-xs text-neutral-500">
                                Daily completed retail revenue generated at this location.
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setInsightsChartType('area')}
                                className={`px-2.5 py-1 text-xs font-semibold rounded-sm border transition-all cursor-pointer ${
                                  insightsChartType === 'area'
                                    ? 'bg-[#7e2562] text-white border-[#7e2562]'
                                    : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
                                }`}
                              >
                                Area Curve
                              </button>
                              <button
                                onClick={() => setInsightsChartType('bar')}
                                className={`px-2.5 py-1 text-xs font-semibold rounded-sm border transition-all cursor-pointer ${
                                  insightsChartType === 'bar'
                                    ? 'bg-[#7e2562] text-white border-[#7e2562]'
                                    : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
                                }`}
                              >
                                Bar Chart
                              </button>
                            </div>
                          </div>

                          <div className="h-64 sm:h-72 w-full">
                            {insights?.salesTrend && insights.salesTrend.length > 0 ? (
                              <ResponsiveContainer width="100%" height="100%">
                                {insightsChartType === 'area' ? (
                                  <AreaChart data={insights.salesTrend}>
                                    <defs>
                                      <linearGradient id="branchColorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#7e2562" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#7e2562" stopOpacity={0.0} />
                                      </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis
                                      dataKey="date"
                                      tick={{ fontSize: 10 }}
                                      tickFormatter={(val) => {
                                        try {
                                          const d = new Date(val);
                                          return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                                        } catch {
                                          return val;
                                        }
                                      }}
                                    />
                                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(val) => `₹${val}`} />
                                    <Tooltip content={<CustomChartTooltip />} />
                                    <Area
                                      type="monotone"
                                      dataKey="revenue"
                                      stroke="#7e2562"
                                      strokeWidth={2}
                                      fillOpacity={1}
                                      fill="url(#branchColorRevenue)"
                                    />
                                  </AreaChart>
                                ) : (
                                  <BarChart data={insights.salesTrend}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis
                                      dataKey="date"
                                      tick={{ fontSize: 10 }}
                                      tickFormatter={(val) => {
                                        try {
                                          const d = new Date(val);
                                          return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                                        } catch {
                                          return val;
                                        }
                                      }}
                                    />
                                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(val) => `₹${val}`} />
                                    <Tooltip content={<CustomChartTooltip />} />
                                    <Bar dataKey="revenue" fill="#7e2562" radius={[3, 3, 0, 0]} />
                                  </BarChart>
                                )}
                              </ResponsiveContainer>
                            ) : (
                              <div className="h-full flex items-center justify-center text-neutral-400 text-xs">
                                No sales transactions recorded in the selected period.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB 2: INVENTORY & STOCK HEALTH */}
                    {insightsTab === 'inventory' && (
                      <div className="space-y-6">
                        {/* Stock Metric Cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                          <div className="p-4 bg-white rounded-sm border border-neutral-200 shadow-2xs">
                            <span className="text-[10px]   font-bold text-neutral-400">Total Stock</span>
                            <div className="text-xl sm:text-2xl font-black text-neutral-900 mt-1">
                              {(insights?.inventory?.totalStockQty || 0).toLocaleString('en-IN')}
                            </div>
                            <span className="text-[10px] text-emerald-600 font-medium mt-1 block">In-Stock units</span>
                          </div>

                          <div className="p-4 bg-white rounded-sm border border-neutral-200 shadow-2xs">
                            <span className="text-[10px]   font-bold text-neutral-400">Catalog Titles</span>
                            <div className="text-xl sm:text-2xl font-black text-neutral-900 mt-1">
                              {(insights?.inventory?.uniqueTitlesCount || 0).toLocaleString('en-IN')}
                            </div>
                            <span className="text-[10px] text-neutral-500 mt-1 block">Unique book titles</span>
                          </div>

                          <div className="p-4 bg-white rounded-sm border border-neutral-200 shadow-2xs">
                            <span className="text-[10px]   font-bold text-neutral-400">Low Stock Alerts</span>
                            <div
                              className={`text-xl sm:text-2xl font-black mt-1 ${
                                (insights?.inventory?.lowStockCount || 0) > 0 ? 'text-[#e45e34]' : 'text-neutral-900'
                              }`}
                            >
                              {insights?.inventory?.lowStockCount || 0}
                            </div>
                            <span className="text-[10px] text-[#e45e34] font-medium mt-1 block">
                              Below reorder threshold
                            </span>
                          </div>

                          <div className="p-4 bg-white rounded-sm border border-neutral-200 shadow-2xs">
                            <span className="text-[10px]   font-bold text-neutral-400">Est. Stock Valuation</span>
                            <div className="text-xl sm:text-2xl font-black text-[#7e2562] mt-1">
                              ₹{(insights?.inventory?.stockValue || 0).toLocaleString('en-IN', {
                                maximumFractionDigits: 0,
                              })}
                            </div>
                            <span className="text-[10px] text-neutral-500 mt-1 block">Retail catalog valuation</span>
                          </div>
                        </div>

                        {/* Low Stock Watchlist */}
                        <div className="bg-white rounded-sm border border-neutral-200 shadow-2xs overflow-hidden">
                          <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50">
                            <div>
                              <h4 className="text-xs font-bold   tracking-wider text-neutral-900 flex items-center gap-1.5">
                                <AlertTriangle className="w-4 h-4 text-[#e45e34]" />
                                Critical Low Stock Watchlist
                              </h4>
                              <p className="text-[11px] text-neutral-500 mt-0.5">
                                Book titles that have breached the minimum reorder threshold at this location.
                              </p>
                            </div>

                            <Link
                              href={
                                (insights?.branch?.type || selectedBranch?.type) === 'WAREHOUSE'
                                  ? '/dashboard/central-stock'
                                  : `/dashboard/inventory?branchId=${insights?.branch?.id || selectedBranch?.id || insightsBranchId}`
                              }
                              className="px-3 py-1.5 bg-[#7e2562] text-white text-xs font-bold rounded-sm hover:bg-[#681b50] transition-colors"
                            >
                              Manage Branch Inventory
                            </Link>
                          </div>

                          {insights?.topLowStockBooks && insights.topLowStockBooks.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs">
                                <thead className="bg-[#faf6f9] text-neutral-700 font-bold border-b border-neutral-200">
                                  <tr>
                                    <th className="p-3">Book Title</th>
                                    <th className="p-3">ISBN</th>
                                    <th className="p-3">Retail Price</th>
                                    <th className="p-3 text-center">Available Qty</th>
                                    <th className="p-3 text-center">Reorder Threshold</th>
                                    <th className="p-3 text-right">Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100">
                                  {insights.topLowStockBooks.map((item: any) => (
                                    <tr key={item.bookId} className="hover:bg-neutral-50/80">
                                      <td className="p-3 font-semibold text-neutral-900">{item.title}</td>
                                      <td className="p-3 font-mono text-neutral-500">{item.isbn || 'N/A'}</td>
                                      <td className="p-3 font-medium text-neutral-800">
                                        ₹{Number(item.price || 0).toFixed(2)}
                                      </td>
                                      <td className="p-3 text-center font-bold text-[#e45e34]">{item.quantity}</td>
                                      <td className="p-3 text-center font-medium text-neutral-600">
                                        {item.threshold}
                                      </td>
                                      <td className="p-3 text-right">
                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#fef2f2] text-[#e45e34] border border-[#e45e34]/30  ">
                                          {item.quantity === 0 ? 'Out of Stock' : 'Low Stock'}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="p-8 text-center text-xs text-neutral-500">
                              <CheckCircle2 className="w-8 h-8 text-[#3cb976] mx-auto mb-2" />
                              <p className="font-semibold text-neutral-800">Inventory Health Optimal</p>
                              <p className="text-neutral-500 mt-0.5">No low stock or out-of-stock items detected at this location.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* TAB 3: STAFF & PERSONNEL */}
                    {insightsTab === 'staff' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                          <div>
                            <h4 className="text-sm font-bold text-neutral-900">Branch Personnel & Staff Team</h4>
                            <p className="text-xs text-neutral-500">
                              Users assigned to this location with their respective system roles and access status.
                            </p>
                          </div>
                        </div>

                        {insights?.staff && insights.staff.length > 0 ? (
                          <div className="bg-white rounded-sm border border-neutral-200 overflow-hidden shadow-2xs">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-[#faf6f9] text-neutral-700 font-bold border-b border-neutral-200">
                                <tr>
                                  <th className="p-3.5">Employee Name</th>
                                  <th className="p-3.5">Email</th>
                                  <th className="p-3.5">Assigned Role</th>
                                  <th className="p-3.5 text-center">Status</th>
                                  <th className="p-3.5 text-right">Registered Date</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-neutral-100">
                                {insights.staff.map((u: any) => (
                                  <tr key={u.id} className="hover:bg-neutral-50/80">
                                    <td className="p-3.5 font-bold text-neutral-900 flex items-center gap-2">
                                      <div className="w-7 h-7 rounded-sm bg-[#7e2562] text-white flex items-center justify-center font-bold text-[11px]">
                                        {u.name.substring(0, 2).toUpperCase()}
                                      </div>
                                      <span>{u.name}</span>
                                    </td>
                                    <td className="p-3.5 text-neutral-600">{u.email}</td>
                                    <td className="p-3.5">
                                      <span className="font-semibold text-neutral-800 bg-neutral-100 px-2 py-0.5 rounded-sm">
                                        {u.primaryRole?.replace('_', ' ') || 'STAFF'}
                                      </span>
                                    </td>
                                    <td className="p-3.5 text-center">
                                      <span
                                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold   ${
                                          u.isActive !== false
                                            ? 'bg-[#eaf8f1] text-[#3cb976] border border-[#3cb976]/30'
                                            : 'bg-[#fef2f2] text-[#e45e34] border border-[#e45e34]/30'
                                        }`}
                                      >
                                        {u.isActive !== false ? 'Active' : 'Inactive'}
                                      </span>
                                    </td>
                                    <td className="p-3.5 text-right text-neutral-500 font-mono text-[11px]">
                                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="bg-white p-8 rounded-sm border border-neutral-200 text-center text-xs text-neutral-500">
                            <Users className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                            <p className="font-semibold text-neutral-700">No Staff Assigned</p>
                            <p className="text-neutral-500 mt-0.5">Assign managers or cashiers to this branch via Users management.</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB 4: RECENT ACTIVITY & TRANSFERS (COMMENTED OUT)
                    {insightsTab === 'activity' && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        <div className="bg-white rounded-sm border border-neutral-200 shadow-2xs overflow-hidden">
                          <div className="p-3.5 border-b border-neutral-100 bg-[#faf6f9] flex items-center justify-between">
                            <h4 className="text-xs font-bold   tracking-wider text-neutral-900 flex items-center gap-1.5">
                              <Receipt className="w-4 h-4 text-[#7e2562]" />
                              Recent Completed Sales Bills
                            </h4>
                          </div>
                          {insights?.recentBills && insights.recentBills.length > 0 ? (
                            <div className="divide-y divide-neutral-100">
                              {insights.recentBills.map((bill: any) => (
                                <div key={bill.id} className="p-3 hover:bg-neutral-50/80 flex items-center justify-between text-xs">
                                  <div>
                                    <span className="font-mono font-bold text-neutral-900 block">{bill.billNumber}</span>
                                    <span className="text-[11px] text-neutral-500">
                                      By {bill.cashierName || 'Cashier'} • {new Date(bill.createdAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <span className="font-extrabold text-[#7e2562] block">
                                      ₹{Number(bill.totalAmount || 0).toFixed(2)}
                                    </span>
                                    <span className="text-[10px] font-semibold   px-1.5 py-0.2 bg-neutral-100 rounded-sm text-neutral-600">
                                      {bill.paymentMode || 'CASH'}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-6 text-center text-xs text-neutral-500">No recent sales bills recorded.</div>
                          )}
                        </div>

                        <div className="bg-white rounded-sm border border-neutral-200 shadow-2xs overflow-hidden">
                          <div className="p-3.5 border-b border-neutral-100 bg-[#faf6f9] flex items-center justify-between">
                            <h4 className="text-xs font-bold   tracking-wider text-neutral-900 flex items-center gap-1.5">
                              <Truck className="w-4 h-4 text-indigo-600" />
                              Recent Stock Transfers
                            </h4>
                          </div>
                          {insights?.recentTransfers && insights.recentTransfers.length > 0 ? (
                            <div className="divide-y divide-neutral-100">
                              {insights.recentTransfers.map((st: any) => (
                                <div key={st.id} className="p-3 hover:bg-neutral-50/80 flex items-center justify-between text-xs">
                                  <div>
                                    <span className="font-mono font-bold text-neutral-900 block">{st.transferNumber}</span>
                                    <span className="text-[11px] text-neutral-500 flex items-center gap-1 mt-0.5">
                                      <span>{st.sourceBranchName || 'Source'}</span>
                                      <ArrowRight className="w-3 h-3 text-neutral-400" />
                                      <span>{st.targetBranchName || 'Target'}</span>
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <span className="font-bold text-neutral-900 block">{st.totalQty || 0} Units</span>
                                    <span
                                      className={`text-[10px] font-extrabold   px-2 py-0.2 rounded-full ${
                                        st.status === 'RECEIVED'
                                          ? 'bg-[#eaf8f1] text-[#3cb976]'
                                          : st.status === 'IN_TRANSIT'
                                          ? 'bg-amber-100 text-amber-800'
                                          : 'bg-neutral-100 text-neutral-700'
                                      }`}
                                    >
                                      {st.status}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-6 text-center text-xs text-neutral-500">No stock transfers recorded.</div>
                          )}
                        </div>
                      </div>
                    )}
                    */}
                  </>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-3.5 bg-neutral-50 border-t border-neutral-200 flex justify-between items-center text-xs">
                <span className="text-neutral-500">
                  Branch ID: <span className="font-mono text-neutral-700">{insights?.branch?.id}</span>
                </span>
                <button
                  onClick={() => setInsightsBranchId(null)}
                  className="px-4 py-2 bg-white border border-neutral-300 rounded-sm font-bold text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  Close Dashboard
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE / EDIT BRANCH MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-sm shadow-xl w-full max-w-md p-6 border border-[#7e2562]/20"
            >
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                <h3 className="text-lg font-bold text-neutral-900 flex items-center">
                  <Store className="w-5 h-5 mr-2 text-[#7e2562]" />
                  {editingBranch ? 'Edit Branch' : 'Register New Branch'}
                </h3>
                <div className="flex items-center gap-2">
                  {!editingBranch && (
                    <button
                      type="button"
                      onClick={handleFillDemoBranch}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#7e2562] bg-[#faedf5] hover:bg-[#f3dcee] border border-[#7e2562]/20 rounded-sm shadow-2xs transition-all cursor-pointer active:scale-95"
                      title="Fill sample branch data for staging"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#7e2562]" />
                      <span>Fill Dummy Data</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-[#faedf5] rounded-sm transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold   tracking-wider text-neutral-600 mb-1">
                    Branch Name *
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Downtown Central"
                    className="block w-full px-3 py-2 border border-[#7e2562]/20 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-[#7e2562] focus:border-[#7e2562]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold   tracking-wider text-neutral-600 mb-1">
                    Branch Code *
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g. DWTN-01"
                    className="block w-full px-3 py-2 border border-[#7e2562]/20 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-[#7e2562] focus:border-[#7e2562]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold   tracking-wider text-neutral-600 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="e.g. Kozhikode"
                    className="block w-full px-3 py-2 border border-[#7e2562]/20 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-[#7e2562] focus:border-[#7e2562]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold   tracking-wider text-neutral-600 mb-1">
                    Address
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Full street address..."
                    className="block w-full px-3 py-2 border border-[#7e2562]/20 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-[#7e2562] focus:border-[#7e2562]"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold   tracking-wider text-neutral-600 mb-1">
                    Branch Type *
                  </label>
                  <Dropdown
                    value={formData.type}
                    onChange={(val) => setFormData({ ...formData, type: val })}
                    options={[
                      { value: 'STORE', label: 'Store (Retail Outlet)' },
                      { value: 'WAREHOUSE', label: 'Warehouse (Central Fulfillment Hub)' },
                    ]}
                  />
                </div>

                {editingBranch && (
                  <div className="flex items-center mt-4">
                    <input
                      id="isActive"
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="h-4 w-4 text-[#7e2562] focus:ring-[#7e2562] border-neutral-300 rounded-sm"
                    />
                    <label htmlFor="isActive" className="ml-2 block text-xs font-medium text-neutral-800">
                      Active (Uncheck to deactivate branch)
                    </label>
                  </div>
                )}

                <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold   tracking-wider text-neutral-700 bg-white border border-neutral-300 rounded-sm hover:bg-neutral-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center px-4 py-2 text-xs font-bold   tracking-wider text-white bg-[#7e2562] rounded-sm hover:bg-[#681b50] disabled:opacity-50 transition-colors shadow-sm shadow-plum-sm cursor-pointer"
                  >
                    {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Save Branch
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
