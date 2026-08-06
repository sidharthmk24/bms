"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApiData } from '@/hooks/useApiData';
import { Shield, ChevronDown, UserSquare2, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ROLES = [
  { value: 'SUPER_ADMIN', label: 'Super Admin', requiresBranch: false },
  { value: 'ADMIN', label: 'Admin', requiresBranch: false },
  { value: 'FINANCE', label: 'Finance', requiresBranch: false },
  { value: 'CENTRAL_INVENTORY_MANAGER', label: 'Central Inventory', requiresBranch: false },
  { value: 'BRANCH_MANAGER', label: 'Branch Manager', requiresBranch: true },
  { value: 'BRANCH_INVENTORY', label: 'Branch Inventory', requiresBranch: true },
  { value: 'BRANCH_FRONT_OFFICE', label: 'Branch Front Office', requiresBranch: true },
];

export default function RoleSwitcher() {
  const { user, impersonate, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  
  // Modal for branch selection
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [pendingRole, setPendingRole] = useState<string | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState('');

  const { data: branchesResponse } = useApiData<any>('/branches', []);
  const branches = branchesResponse?.items || (Array.isArray(branchesResponse) ? branchesResponse : []);

  // Only show if the user is originally a SUPER_ADMIN (using various checks)
  const isOriginalSuperAdmin = user?.roles?.includes('SUPER_ADMIN') || user?.originalRoles?.includes('SUPER_ADMIN') || user?.originalRole === 'SUPER_ADMIN' || user?.name === 'Super Admin';

  if (!isOriginalSuperAdmin) {
    return null;
  }

  const handleRoleSelect = (roleValue: string, requiresBranch: boolean) => {
    setIsOpen(false);
    
    if ((roleValue === user?.primaryRole || roleValue === user?.role) && !requiresBranch) return;

    if (requiresBranch) {
      setPendingRole(roleValue);
      setIsBranchModalOpen(true);
    } else {
      impersonate(roleValue);
    }
  };

  const confirmBranchImpersonation = () => {
    if (pendingRole && selectedBranchId) {
      impersonate(pendingRole, selectedBranchId);
      setIsBranchModalOpen(false);
      setPendingRole(null);
    }
  };

  const handleStopImpersonating = () => {
    setIsOpen(false);
    impersonate('SUPER_ADMIN'); // Switch back to Super Admin
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-colors ${
          user?.originalRole === 'SUPER_ADMIN' || user?.originalRoles?.includes('SUPER_ADMIN')
            ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' 
            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
        }`}
      >
        <Shield className={`w-4 h-4 ${user?.originalRole === 'SUPER_ADMIN' || user?.originalRoles?.includes('SUPER_ADMIN') ? 'text-amber-600' : 'text-slate-500'}`} />
        <span className="text-sm font-medium">
          {user?.originalRole === 'SUPER_ADMIN' || user?.originalRoles?.includes('SUPER_ADMIN') 
            ? `Viewing as: ${user?.primaryRole || user?.role || user?.roles?.[0]}` 
            : 'Super Admin'}
        </span>
        <ChevronDown className="w-4 h-4 opacity-50" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50"
            >
              <div className="p-3 border-b border-gray-100 bg-gray-50/50">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Switch Role</p>
              </div>
              <div className="max-h-[60vh] overflow-y-auto py-2">
                {ROLES.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => handleRoleSelect(r.value, r.requiresBranch)}
                    className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between hover:bg-blue-50 transition-colors ${
                      (user?.primaryRole === r.value || user?.role === r.value) ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                    }`}
                  >
                    <span>{r.label}</span>
                    {r.requiresBranch && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Branch</span>}
                  </button>
                ))}
              </div>
              
              {(user?.originalRole === 'SUPER_ADMIN' || user?.originalRoles?.includes('SUPER_ADMIN')) && (
                <div className="p-2 border-t border-gray-100 bg-amber-50">
                  <button
                    onClick={handleStopImpersonating}
                    className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Stop Impersonating</span>
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Branch Selection Modal */}
      <AnimatePresence>
        {isBranchModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative z-[70]"
            >
              <h3 className="text-lg font-bold text-gray-900 mb-2">Select Branch</h3>
              <p className="text-sm text-gray-500 mb-4">
                The role <span className="font-semibold text-gray-700">{pendingRole}</span> requires a branch context. Which branch do you want to view?
              </p>
              
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm mb-6"
              >
                <option value="" disabled>Select a branch...</option>
                {branches.map((b: any) => (
                  <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                ))}
              </select>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setIsBranchModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmBranchImpersonation}
                  disabled={!selectedBranchId}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Impersonate
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
