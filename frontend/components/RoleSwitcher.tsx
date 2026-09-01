"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApiData } from '@/hooks/useApiData';
import { Shield, ChevronDown, LogOut } from 'lucide-react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Dropdown } from '@/components/Dropdown';

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

  const isImpersonating = user?.originalRole === 'SUPER_ADMIN' || user?.originalRoles?.includes('SUPER_ADMIN');

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-black text-white hover:bg-neutral-900 border border-neutral-800 shadow-sm transition-all duration-200"
      >
        <Shield className="w-4 h-4 text-white" />
        <span className="text-xs font-semibold tracking-wide">
          {isImpersonating 
            ? `Viewing as: ${(user?.primaryRole || user?.role || user?.roles?.[0] || '').replace(/_/g, ' ')}` 
            : 'Super Admin'}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
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
              className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-neutral-200 overflow-hidden z-50 flex flex-col"
            >
              <div className="p-3 border-b border-neutral-200 bg-neutral-50/80">
                <p className="text-xs font-bold text-black uppercase tracking-wider">Switch Role</p>
              </div>
              <div className="max-h-[60vh] overflow-y-auto py-1 divide-y divide-neutral-100">
                {ROLES.map((r) => {
                  const isCurrent = user?.primaryRole === r.value || user?.role === r.value;
                  return (
                    <button
                      key={r.value}
                      onClick={() => handleRoleSelect(r.value, r.requiresBranch)}
                      className={`w-full text-left px-4 py-2.5 text-xs flex items-center justify-between transition-colors ${
                        isCurrent 
                          ? 'bg-neutral-100 text-black font-bold' 
                          : 'text-neutral-700 hover:bg-neutral-50 hover:text-black'
                      }`}
                    >
                      <span>{r.label}</span>
                      {r.requiresBranch && (
                        <span className="text-[10px] bg-neutral-200 text-neutral-800 font-semibold px-1.5 py-0.5 rounded">
                          Branch
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              
              {isImpersonating && (
                <div className="p-2 border-t border-neutral-200 bg-neutral-50">
                  <button
                    onClick={handleStopImpersonating}
                    className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-xs font-semibold text-white bg-black hover:bg-neutral-900 rounded-xl transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5 text-white" />
                    <span>Stop Impersonating</span>
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Branch Selection Modal */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isBranchModalOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-md p-6 relative z-[70]"
            >
              <h3 className="text-base font-bold text-black mb-1">Select Branch</h3>
              <p className="text-xs text-neutral-600 mb-4">
                The role <span className="font-semibold text-black">{pendingRole}</span> requires a branch context. Which branch do you want to view?
              </p>
              
              <div className="mb-6">
                <Dropdown
                  value={selectedBranchId}
                  onChange={(val) => setSelectedBranchId(val)}
                  placeholder="Select a branch..."
                  options={branches.map((b: any) => ({
                    value: b.id,
                    label: `${b.name} (${b.code})`
                  }))}
                />
              </div>

              <div className="flex justify-end space-x-2.5">
                <button
                  onClick={() => setIsBranchModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-black bg-white border border-neutral-300 rounded-xl hover:bg-neutral-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmBranchImpersonation}
                  disabled={!selectedBranchId}
                  className="px-4 py-2 text-xs font-semibold text-white bg-black rounded-xl hover:bg-neutral-900 disabled:opacity-50 transition-colors"
                >
                  Impersonate
                </button>
              </div>
            </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
