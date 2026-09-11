"use client";

import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApiData } from '@/hooks/useApiData';
import { Loader2, AlertCircle, Search, Shield, History, ArrowRight, ChevronDown, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { matchKeywords } from '@/lib/searchUtils';
import { Pagination } from '@/components/Pagination';

// ── Common entity-type categories ──────────────────────────────────────────
const ENTITY_CATEGORIES: Record<string, string[]> = {
  'Catalog & Books': ['Book', 'Author', 'Publisher', 'Category', 'Supplier'],
  'Users & Auth':    ['User', 'UserRole'],
  'Billing':         ['Bill', 'BillItem'],
  'Inventory':       ['CentralStock', 'BranchInventory', 'StockMovement'],
  'Restock':         ['RestockRequest', 'RestockRequestItem'],
  'Procurement':     ['PurchaseOrder', 'PurchaseOrderItem'],
  'Exhibitions':     ['Exhibition', 'ExhibitionStock'],
  'Enquiries':       ['BookEnquiry', 'NewTitleRequest'],
  'Finance':         ['Expense', 'CashReconciliation'],
  'Branches':        ['Branch'],
  'Settings':        ['SystemSetting'],
};

const ALL_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'CENTRAL_INVENTORY_MANAGER',
  'FINANCE',
  'BRANCH_MANAGER',
  'BRANCH_INVENTORY',
  'BRANCH_FRONT_OFFICE',
];

// ── Tiny custom select ─────────────────────────────────────────────────────
function FilterSelect({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <div className="relative" id={id}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={`flex items-center gap-2 px-3 py-2 rounded-sm border text-xs font-semibold transition-all
          ${value
            ? 'border-[#7e2562] bg-[#faedf5] text-[#7e2562]'
            : 'border-neutral-300 bg-white text-neutral-700 hover:border-[#7e2562]/40'
          }`}
      >
        <span className="max-w-[140px] truncate">
          {selected?.label ?? label}
        </span>
        {value && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onChange(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onChange(''); } }}
            className="ml-0.5 text-[#7e2562] hover:text-[#541440]"
          >
            <X className="w-3.5 h-3.5" />
          </span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-1 left-0 z-30 bg-white border border-[#7e2562]/20 rounded-sm shadow-lg min-w-[180px] overflow-hidden"
          >
            <ul className="py-1 max-h-60 overflow-y-auto">
              {options.map((opt) => (
                <li key={opt.value}>
                  <button
                    type="button"
                    onClick={() => { onChange(opt.value); setOpen(false); }}
                    className={`w-full text-left px-4 py-2 text-xs transition-colors
                      ${opt.value === value
                        ? 'bg-[#faedf5] text-[#7e2562] font-bold'
                        : opt.value === '__none__'
                          ? 'text-neutral-400 italic hover:bg-[#faf6f9] border-t border-neutral-100'
                          : 'text-neutral-700 hover:bg-[#faf6f9]'
                      }`}
                  >
                    {opt.label}
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop to close */}
      {open && (
        <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function AuditLogPage() {
  const { user } = useAuth();

  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data: logsResponse, loading, error } = useApiData<any>(`/audit?page=${page}&limit=${pageSize}`, []);
  const logs = logsResponse?.items || (Array.isArray(logsResponse) ? logsResponse : []);
  const totalItems = logsResponse?.total || logs.length;
  const totalPages = logsResponse?.totalPages || Math.ceil(totalItems / pageSize) || 1;

  const { data: branchesResponse } = useApiData<any>('/branches', []);
  const allBranches = branchesResponse?.items || (Array.isArray(branchesResponse) ? branchesResponse : []);

  const [searchTerm, setSearchTerm]         = useState('');
  const [roleFilter, setRoleFilter]         = useState('');
  const [branchFilter, setBranchFilter]     = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedLog, setSelectedLog]       = useState<any>(null);

  // ── Derive branch options ─────────────────────────────────────────────
  const branchOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const b of allBranches) {
      if (b.id && b.name) seen.set(b.id, b.name);
    }
    for (const log of (Array.isArray(logs) ? logs : [])) {
      const branch = log.user?.branch;
      if (branch?.id && branch?.name && !seen.has(branch.id)) {
        seen.set(branch.id, branch.name);
      }
    }
    const opts = Array.from(seen.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([id, name]) => ({ label: name, value: id }));
    opts.push({ label: 'None of these', value: '__none__' });
    return opts;
  }, [logs, allBranches]);

  // ── Derive category options from entityTypes present in logs ──────────
  const categoryOptions = useMemo(() => {
    if (!logs) return [];
    const presentTypes = new Set(logs.map((l: any) => l.entityType).filter(Boolean));
    const matched = new Set<string>();
    const opts: { label: string; value: string }[] = [];
    for (const [catLabel, types] of Object.entries(ENTITY_CATEGORIES)) {
      if (types.some((t) => presentTypes.has(t))) {
        opts.push({ label: catLabel, value: catLabel });
        for (const t of types) matched.add(t);
      }
    }
    const hasOther = [...presentTypes].some((t) => !matched.has(t));
    if (hasOther) opts.push({ label: 'Other', value: '__other__' });
    opts.push({ label: 'None of these', value: '__none__' });
    return opts;
  }, [logs]);

  const roleOptions = useMemo(() => {
    const opts = ALL_ROLES.map((r) => ({ label: r.replace(/_/g, ' '), value: r }));
    opts.push({ label: 'None of these', value: '__none__' });
    return opts;
  }, []);

  // ── Filter logic ───────────────────────────────────────────────────────
  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    return logs.filter((log: any) => {
      // Text search
      if (searchTerm) {
        const match = matchKeywords(
          searchTerm,
          log.action,
          log.entityType,
          log.user?.name,
          log.user?.primaryRole,
          log.user?.branch?.name,
          log.ipAddress,
          log.entityId
        );
        if (!match) return false;
      }

      // Role filter
      if (roleFilter && roleFilter !== '__none__') {
        if (log.user?.primaryRole !== roleFilter) return false;
      } else if (roleFilter === '__none__') {
        if (ALL_ROLES.includes(log.user?.primaryRole)) return false;
      }

      // Branch filter
      if (branchFilter && branchFilter !== '__none__') {
        if (log.user?.branch?.id !== branchFilter) return false;
      } else if (branchFilter === '__none__') {
        if (log.user?.branch?.id) return false;
      }

      // Category filter
      if (categoryFilter && categoryFilter !== '__none__') {
        if (categoryFilter === '__other__') {
          const allKnown = Object.values(ENTITY_CATEGORIES).flat();
          if (allKnown.includes(log.entityType)) return false;
        } else {
          const types = ENTITY_CATEGORIES[categoryFilter] ?? [];
          if (!types.includes(log.entityType)) return false;
        }
      } else if (categoryFilter === '__none__') {
        const allKnown = Object.values(ENTITY_CATEGORIES).flat();
        if (allKnown.includes(log.entityType)) return false;
      }

      return true;
    });
  }, [logs, searchTerm, roleFilter, branchFilter, categoryFilter]);

  const activeFilterCount = [roleFilter, branchFilter, categoryFilter].filter(Boolean).length;

  const clearAllFilters = () => {
    setRoleFilter('');
    setBranchFilter('');
    setCategoryFilter('');
    setSearchTerm('');
  };

  // ── Helpers ────────────────────────────────────────────────────────────
  const formatKey = (key: string) => {
    return key
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const formatValue = (val: any, branchMap: Map<string, string>, userMap: Map<string, string>): string => {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    
    // UUID check to see if we should try translating it
    if (typeof val === 'string' && val.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      if (branchMap.has(val)) return branchMap.get(val)!;
      if (userMap.has(val)) return userMap.get(val)!;
    }

    if (val instanceof Date || (typeof val === 'string' && val.includes('T') && val.endsWith('Z'))) {
      try {
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
          return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        }
      } catch (e) {}
    }
    
    if (Array.isArray(val)) {
      if (val.length === 0) return 'None';
      if (typeof val[0] === 'object' && val[0] !== null) {
        return val.map((item: any) => {
          const label = item.name || item.title || item.role || item.code || item.id;
          if (typeof label === 'string') {
             return label.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          }
          return 'Item';
        }).join(', ');
      }
      return val.join(', ');
    }
    
    if (typeof val === 'object') {
       const label = val.name || val.title || val.role || val.code;
       if (label && typeof label === 'string') {
          return label.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
       }
       const keys = Object.keys(val).filter(k => !k.includes('id') && !k.includes('Id') && !k.includes('At'));
       if (keys.length > 0) return keys.map(k => `${formatKey(k)}: ${val[k]}`).join(', ');
       return 'Data Record';
    }
    
    return String(val);
  };

  const getDiff = (before: any, after: any, logs: any[]) => {
    const b = before || {};
    const a = after || {};
    const allKeys = Array.from(new Set([...Object.keys(b), ...Object.keys(a)]));
    
    // Build quick lookup maps for IDs to Names based on logs
    const branchMap = new Map<string, string>();
    const userMap = new Map<string, string>();
    (logs || []).forEach((l: any) => {
      if (l.user?.branch?.id && l.user?.branch?.name) branchMap.set(l.user.branch.id, l.user.branch.name);
      if (l.user?.id && l.user?.name) userMap.set(l.user.id, l.user.name);
    });
    
    const changes: any[] = [];
    const added: any[] = [];
    const removed: any[] = [];
    const unchanged: any[] = [];
    
    allKeys.forEach(key => {
      // Exclude deeply technical or noisy fields completely
      if (['passwordHash', 'password_hash', 'id', 'createdAt', 'updatedAt', 'deletedAt'].includes(key)) return;
      
      const valB = b[key];
      const valA = a[key];
      const strB = formatValue(valB, branchMap, userMap);
      const strA = formatValue(valA, branchMap, userMap);
      
      // Clean up key name
      let displayKey = formatKey(key);
      if (key === 'branchId') displayKey = 'Branch';
      if (key === 'userId' || key === 'createdById' || key === 'authorId') displayKey = displayKey.replace(' Id', '');
      
      if (valB === undefined && valA !== undefined) {
        added.push({ key: displayKey, val: strA });
      } else if (valB !== undefined && valA === undefined) {
        removed.push({ key: displayKey, val: strB });
      } else if (strB !== strA) {
        changes.push({ key: displayKey, old: strB, new: strA });
      } else {
        unchanged.push({ key: displayKey, val: strA });
      }
    });
    
    return { changes, added, removed, unchanged };
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });

  const getActionColor = (action: string) => {
    if (action.includes('CREATED') || action.includes('ADDED') || action.includes('APPROVED'))
      return 'bg-[#f0fbf5] text-[#3cb976] border border-[#3cb976]/30';
    if (action.includes('DELETED') || action.includes('REJECTED') || action.includes('DEACTIVATED'))
      return 'bg-[#fef5f2] text-[#e45e34] border border-[#e45e34]/30';
    if (action.includes('UPDATED') || action.includes('ADJUSTED'))
      return 'bg-[#faedf5] text-[#7e2562] border border-[#7e2562]/20';
    if (action.includes('LOGIN') || action.includes('LOGOUT'))
      return 'bg-violet-50 text-violet-700 border border-violet-200';
    return 'bg-neutral-100 text-neutral-700 border border-neutral-200';
  };

  const getRoleColor = (role: string) => {
    if (role === 'SUPER_ADMIN') return 'text-[#e45e34] bg-[#fef5f2] border border-[#e45e34]/20';
    if (role === 'ADMIN') return 'text-amber-700 bg-amber-50 border border-amber-200';
    if (role === 'CENTRAL_INVENTORY_MANAGER') return 'text-[#7e2562] bg-[#faedf5] border border-[#7e2562]/20';
    if (role === 'FINANCE') return 'text-[#3cb976] bg-[#f0fbf5] border border-[#3cb976]/30';
    return 'text-[#7e2562] bg-[#faedf5] border border-[#7e2562]/20';
  };

  // ── Guards ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#7e2562]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#fef5f2] text-[#e45e34] border border-[#e45e34]/20 p-4 rounded-sm flex items-center">
        <AlertCircle className="w-5 h-5 mr-2" />
        {error}
      </div>
    );
  }

  if (!user?.roles?.includes('SUPER_ADMIN')) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <Shield className="w-16 h-16 text-[#e45e34] mb-4" />
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">Access Denied</h2>
        <p className="text-neutral-500 max-w-md text-sm">
          The Audit Log is a restricted area. Only Super Administrators can view system-wide activity and security trails.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#2a0c20] via-[#541440] to-[#7e2562] rounded-sm p-7 text-white shadow-md">
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-white/10 rounded-sm">
            <History className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">System Audit Log</h2>
            <p className="text-[#faedf5]/80 mt-1.5 max-w-2xl text-xs leading-relaxed">
              The Audit Log acts as the central security and accountability trail for the entire Bookstore Management System.
              It securely records every critical action—along with the exact time, user responsible, their IP address, and a snapshot of data before and after each change.
            </p>
          </div>
        </div>
      </div>

      {/* Controls bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="text-sm font-bold text-neutral-900">Recent Activity Trail</h3>
            <p className="text-xs text-neutral-500">
              Showing <span className="font-semibold text-neutral-800">{filteredLogs.length}</span> of {(logs || []).length} events
              {activeFilterCount > 0 && (
                <span className="ml-1 text-[#7e2562] font-semibold">· {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active</span>
              )}
            </p>
          </div>

          {/* Search */}
          <div className="w-full sm:w-72 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-neutral-400" />
            </div>
            <input
              id="audit-search"
              type="text"
              placeholder="Search actions, entities, users, IPs…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-9 pr-3 py-2 border border-[#7e2562]/20 rounded-sm focus:ring-2 focus:ring-[#7e2562]/20 focus:border-[#7e2562] text-xs outline-none bg-white"
            />
          </div>
        </div>

        {/* Filter chips row */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-neutral-500 font-semibold uppercase tracking-wider">Filter by:</span>

          <FilterSelect
            id="audit-role-filter"
            label="Role"
            value={roleFilter}
            options={roleOptions}
            onChange={setRoleFilter}
          />

          <FilterSelect
            id="audit-branch-filter"
            label="Branch"
            value={branchFilter}
            options={
              branchOptions.length > 1
                ? branchOptions
                : [{ label: 'No branches in logs', value: '' }, { label: 'None of these', value: '__none__' }]
            }
            onChange={setBranchFilter}
          />

          <FilterSelect
            id="audit-category-filter"
            label="Category"
            value={categoryFilter}
            options={categoryOptions}
            onChange={setCategoryFilter}
          />

          {(activeFilterCount > 0 || searchTerm) && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1 px-3 py-2 rounded-sm text-xs font-semibold text-[#e45e34] hover:bg-[#fef5f2] border border-[#e45e34]/20 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white shadow-sm border border-neutral-200/80 rounded-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#faf6f9]/70 text-[11px] font-bold text-[#7e2562] uppercase tracking-wider border-b border-[#7e2562]/10 whitespace-nowrap">
              <tr>
                <th scope="col" className="px-6 py-3.5">Timestamp</th>
                <th scope="col" className="px-6 py-3.5">User / Role</th>
                <th scope="col" className="px-6 py-3.5">Branch</th>
                <th scope="col" className="px-6 py-3.5">Action</th>
                <th scope="col" className="px-6 py-3.5">Entity</th>
                <th scope="col" className="px-6 py-3.5">IP Address</th>
                <th scope="col" className="px-6 py-3.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-[#faf6f9]/40 transition-colors">
                  <td className="px-6 py-3.5 whitespace-nowrap text-xs text-neutral-500">
                    {formatDate(log.createdAt)}
                  </td>
                  <td className="px-6 py-3.5 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-7 w-7 rounded-sm bg-[#faedf5] border border-[#7e2562]/20 flex items-center justify-center text-[#7e2562] font-bold text-xs mr-2.5 flex-shrink-0">
                        {log.user?.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-neutral-900">{log.user?.name || 'System'}</div>
                        <span className={`inline-block text-[10px] px-1.5 py-0.2 rounded-sm font-semibold mt-0.5 ${getRoleColor(log.user?.primaryRole || '')}`}>
                          {log.user?.primaryRole?.replace(/_/g, ' ') || 'SYSTEM'}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 whitespace-nowrap text-xs">
                    {log.user?.branch?.name ? (
                      <span className="font-medium text-neutral-800">{log.user.branch.name}</span>
                    ) : (
                      <span className="text-neutral-400 italic">Chain-wide</span>
                    )}
                  </td>
                  <td className="px-6 py-3.5 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-sm text-[11px] font-bold ${getActionColor(log.action)}`}>
                      {log.action.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 whitespace-nowrap">
                    <div className="text-xs font-bold text-neutral-900">{log.entityType}</div>
                    <div className="text-[10px] text-neutral-400 font-mono">{log.entityId?.substring(0, 8)}…</div>
                  </td>
                  <td className="px-6 py-3.5 whitespace-nowrap text-neutral-500 font-mono text-xs">
                    {log.ipAddress}
                  </td>
                  <td className="px-6 py-3.5 whitespace-nowrap text-right text-xs font-semibold">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="text-[#7e2562] hover:text-[#541440] inline-flex items-center justify-end group"
                    >
                      View Data
                      <ArrowRight className="w-3.5 h-3.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-neutral-400 font-medium">
                    <History className="w-10 h-10 mx-auto text-neutral-200 mb-2" />
                    <p className="text-sm">No audit logs match the current filters.</p>
                    {(activeFilterCount > 0 || searchTerm) && (
                      <button onClick={clearAllFilters} className="mt-2 text-xs text-[#7e2562] font-semibold underline">
                        Clear all filters
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setPage}
        />
      </div>

      {/* Details Modal */}
      <AnimatePresence>
        {selectedLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-sm border border-neutral-200 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="p-5 border-b border-neutral-100 bg-[#faf6f9]/50 flex justify-between items-center">
                <div>
                  <h3 className="text-base font-bold text-neutral-900">Audit Record Details</h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Record ID: <span className="font-mono text-neutral-700">{selectedLog.id}</span>
                  </p>
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-neutral-400 hover:text-neutral-600 bg-neutral-100 hover:bg-neutral-200 p-1.5 rounded-sm transition-colors text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-[#faf6f9]/40 p-4 rounded-sm border border-[#7e2562]/10">
                    <h4 className="text-[11px] font-bold text-[#7e2562] uppercase tracking-wider mb-2.5">Context</h4>
                    <dl className="space-y-1.5 text-xs">
                      <div className="flex justify-between"><dt className="text-neutral-500">Action:</dt> <dd className="font-bold text-neutral-900">{selectedLog.action}</dd></div>
                      <div className="flex justify-between"><dt className="text-neutral-500">Entity:</dt> <dd className="font-semibold text-neutral-800">{selectedLog.entityType}</dd></div>
                      <div className="flex justify-between"><dt className="text-neutral-500">Entity ID:</dt> <dd className="font-mono text-[11px] text-neutral-700">{selectedLog.entityId}</dd></div>
                      <div className="flex justify-between"><dt className="text-neutral-500">Time:</dt> <dd className="text-neutral-700">{formatDate(selectedLog.createdAt)}</dd></div>
                    </dl>
                  </div>
                  <div className="bg-[#faf6f9]/40 p-4 rounded-sm border border-[#7e2562]/10">
                    <h4 className="text-[11px] font-bold text-[#7e2562] uppercase tracking-wider mb-2.5">Actor</h4>
                    <dl className="space-y-1.5 text-xs">
                      <div className="flex justify-between"><dt className="text-neutral-500">Name:</dt> <dd className="font-bold text-neutral-900">{selectedLog.user?.name}</dd></div>
                      <div className="flex justify-between"><dt className="text-neutral-500">Email:</dt> <dd className="text-neutral-700">{selectedLog.user?.email}</dd></div>
                      <div className="flex justify-between"><dt className="text-neutral-500">Role:</dt> <dd className="font-semibold text-neutral-800">{selectedLog.user?.primaryRole}</dd></div>
                      <div className="flex justify-between"><dt className="text-neutral-500">Branch:</dt> <dd className="text-neutral-700">{selectedLog.user?.branch?.name ?? '—'}</dd></div>
                      <div className="flex justify-between"><dt className="text-neutral-500">IP Address:</dt> <dd className="font-mono text-[11px] text-neutral-700">{selectedLog.ipAddress}</dd></div>
                    </dl>
                  </div>
                </div>

                {/* ── Human-Readable Data View ── */}
                <div>
                  <h4 className="text-xs font-bold text-[#7e2562] uppercase tracking-wider mb-3 flex items-center">
                    <span className="w-2 h-2 rounded-sm bg-[#7e2562] mr-2"></span>
                    Data Changes
                  </h4>
                  
                  {(() => {
                    if (!selectedLog.beforeJson && !selectedLog.afterJson) {
                      return <div className="text-neutral-400 italic p-4 bg-neutral-50 rounded-sm border border-neutral-200 text-xs">No data changes recorded for this event.</div>;
                    }
                    
                    const { changes, added, removed, unchanged } = getDiff(selectedLog.beforeJson, selectedLog.afterJson, logs || []);
                    const hasChanges = changes.length > 0 || added.length > 0 || removed.length > 0;
                    
                    return (
                      <div className="bg-white border border-neutral-200/80 rounded-sm overflow-hidden shadow-sm">
                        <table className="w-full divide-y divide-neutral-100 text-xs">
                          <thead className="bg-[#faf6f9]/70 text-[10px] font-bold text-[#7e2562] uppercase tracking-wider border-b border-[#7e2562]/10 whitespace-nowrap">
                            <tr>
                              <th scope="col" className="px-5 py-2.5 text-left w-1/3">Field</th>
                              {hasChanges ? (
                                <>
                                  <th scope="col" className="px-5 py-2.5 text-left w-1/3">Old Value</th>
                                  <th scope="col" className="px-5 py-2.5 text-left w-1/3">New Value</th>
                                </>
                              ) : (
                                <th scope="col" className="px-5 py-2.5 text-left w-2/3">Value</th>
                              )}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-100 text-xs">
                            {/* Modifications */}
                            {changes.map((item, i) => (
                              <tr key={`change-${i}`} className="hover:bg-[#faf6f9]/30">
                                <td className="px-5 py-2.5 font-bold text-neutral-900">{item.key}</td>
                                <td className="px-5 py-2.5 text-[#e45e34] bg-[#fef5f2]/40 line-through font-mono">{item.old}</td>
                                <td className="px-5 py-2.5 text-[#3cb976] bg-[#f0fbf5]/40 font-bold font-mono">{item.new}</td>
                              </tr>
                            ))}
                            
                            {/* Additions */}
                            {added.map((item, i) => (
                              <tr key={`add-${i}`} className="hover:bg-[#faf6f9]/30">
                                <td className="px-5 py-2.5 font-bold text-neutral-900">{item.key}</td>
                                {hasChanges && <td className="px-5 py-2.5 text-neutral-400 italic">—</td>}
                                <td className="px-5 py-2.5 text-[#3cb976] bg-[#f0fbf5]/40 font-bold font-mono">{item.val}</td>
                              </tr>
                            ))}
                            
                            {/* Deletions */}
                            {removed.map((item, i) => (
                              <tr key={`del-${i}`} className="hover:bg-[#faf6f9]/30">
                                <td className="px-5 py-2.5 font-bold text-neutral-900">{item.key}</td>
                                <td className="px-5 py-2.5 text-[#e45e34] bg-[#fef5f2]/40 line-through font-mono">{item.val}</td>
                                {hasChanges && <td className="px-5 py-2.5 text-neutral-400 italic">—</td>}
                              </tr>
                            ))}
                            
                            {/* Unchanged */}
                            {unchanged.map((item, i) => (
                              <tr key={`unchanged-${i}`} className="hover:bg-[#faf6f9]/30">
                                <td className="px-5 py-2.5 text-neutral-500">{item.key}</td>
                                <td className="px-5 py-2.5 text-neutral-700" colSpan={hasChanges ? 2 : 1}>{item.val}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
