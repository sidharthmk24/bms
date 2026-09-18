"use client";

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import { useApiData } from '@/hooks/useApiData';
import { api } from '@/lib/api';
import { Loader2, Plus, Shield, UserX, UserCheck, Settings, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dropdown } from '@/components/Dropdown';
import { Pagination } from '@/components/Pagination';
import { getHighestPriorityRole } from '@/lib/api-backend/users/enums/user-role.enum';

export default function UsersManagementPage() {
  const { user, refreshUser } = useAuth();
  const confirm = useConfirm();
  const canManageUsers = (user?.roles?.some(r => ['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER'].includes(r)) || false);
  
  const { data: usersResponse, loading: usersLoading } = useApiData<any>('/users', []);
  const { data: branches, loading: branchesLoading } = useApiData<any[]>('/branches', []);

  const usersList = usersResponse?.data || usersResponse || [];

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    roles: ['BRANCH_FRONT_OFFICE'],
    branchId: ''
  });

  if (!canManageUsers) {
    return <div className="p-8 text-center text-red-600 font-bold">Access Denied. You do not have permission to manage users.</div>;
  }

  const availableRoles = (() => {
    if (user?.roles?.includes('SUPER_ADMIN')) {
      return [
        { value: 'SUPER_ADMIN', label: 'Super Admin (System Owner)' },
        { value: 'ADMIN', label: 'Admin (HQ Operations)' },
        { value: 'CENTRAL_INVENTORY_MANAGER', label: 'Central Inventory Manager' },
        { value: 'FINANCE', label: 'Finance' },
        { value: 'BRANCH_MANAGER', label: 'Branch Manager' },
        { value: 'BRANCH_INVENTORY', label: 'Branch Inventory' },
        { value: 'BRANCH_FRONT_OFFICE', label: 'Branch Front Office (POS)' },
      ];
    } else if (user?.roles?.includes('ADMIN')) {
      return [
        { value: 'ADMIN', label: 'Admin (HQ Operations)' },
        { value: 'CENTRAL_INVENTORY_MANAGER', label: 'Central Inventory Manager' },
        { value: 'FINANCE', label: 'Finance' },
        { value: 'BRANCH_MANAGER', label: 'Branch Manager' },
        { value: 'BRANCH_INVENTORY', label: 'Branch Inventory' },
        { value: 'BRANCH_FRONT_OFFICE', label: 'Branch Front Office (POS)' },
      ];
    } else if (user?.roles?.includes('BRANCH_MANAGER')) {
      return [
        { value: 'BRANCH_INVENTORY', label: 'Branch Inventory' },
        { value: 'BRANCH_FRONT_OFFICE', label: 'Branch Front Office (POS)' },
      ];
    }
    return [];
  })();

  const openModal = (userItem?: any) => {
    setEditingUser(userItem || null);
    if (userItem) {
      setFormData({
        name: userItem.name || '',
        email: userItem.email || '',
        password: '',
        roles: userItem.roles?.length ? userItem.roles.map((r: any) => r.role || r) : [userItem.role || 'BRANCH_FRONT_OFFICE'],
        branchId: userItem.branch?.id || '' 
      });
    } else {
      setFormData({ 
        name: '', 
        email: '', 
        password: '',
        roles: user?.roles?.includes('BRANCH_MANAGER') ? ['BRANCH_FRONT_OFFICE'] : ['BRANCH_FRONT_OFFICE'], 
        branchId: user?.roles?.includes('BRANCH_MANAGER') ? (user.branchId || '') : '' 
      });
    }
    setIsModalOpen(true);
  };

  const handleFillDemoUser = () => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const firstBranch = (branches && branches.length > 0) ? branches[0].id : '';
    setFormData({
      name: `Staff Member ${randomNum}`,
      email: `staff.${randomNum}@kairalibooks.com`,
      password: '',
      roles: ['BRANCH_FRONT_OFFICE'],
      branchId: user?.roles?.includes('BRANCH_MANAGER') ? (user.branchId || '') : firstBranch,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await confirm({
      title: editingUser ? "Update User Details" : "Provision New User",
      message: editingUser
        ? `Are you sure you want to update details for "${formData.name}"?`
        : `Are you sure you want to provision account for "${formData.name}" (${formData.email})?`,
      confirmText: editingUser ? "Yes, Save Details" : "Yes, Provision User",
      cancelText: "No, Cancel",
      variant: "primary",
    });
    if (!ok) return;

    setIsSubmitting(true);
    try {
      const primaryRole = getHighestPriorityRole(formData.roles);
      const payload = {
        ...formData,
        primaryRole,
        branchId: user?.roles?.includes('BRANCH_MANAGER') 
          ? user.branchId 
          : (formData.roles.some(r => ['BRANCH_MANAGER', 'BRANCH_INVENTORY', 'BRANCH_FRONT_OFFICE'].includes(r)) ? formData.branchId : undefined)
      };

      if (editingUser) {
        const updatePayload: any = {
          name: payload.name,
          email: payload.email,
          roles: payload.roles,
          primaryRole,
          branchId: payload.branchId
        };
        if (formData.password && formData.password.trim()) {
          updatePayload.password = formData.password.trim();
        }

        await api.patch(`/users/${editingUser.id}`, updatePayload);
        if (editingUser.id === user?.id) {
          await refreshUser();
        }
        alert('User details updated successfully!');
      } else {
        await api.post('/users', payload);
        alert(`User provisioned successfully! An email has been sent to ${payload.email} to set up their password.`);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Save failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean, userName?: string) => {
    const actionLabel = currentStatus ? "deactivate" : "activate";
    const ok = await confirm({
      title: `${currentStatus ? "Deactivate" : "Activate"} User`,
      message: `Are you sure you want to ${actionLabel} access for ${userName ? `"${userName}"` : "this user"}?`,
      confirmText: currentStatus ? "Yes, Deactivate" : "Yes, Activate",
      cancelText: "No, Cancel",
      variant: currentStatus ? "danger" : "success",
    });
    if (!ok) return;

    try {
      await api.patch(`/users/${id}/status`, { isActive: !currentStatus });
    } catch (err: any) {
      alert(err.response?.data?.message || 'Status update failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900">User & Staff Management</h2>
          <p className="text-sm text-neutral-500">
            {user?.roles?.includes('BRANCH_MANAGER') 
              ? 'Provision accounts and assign roles for your branch staff.' 
              : 'Provision accounts and assign roles across the enterprise.'}
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center px-4 py-2 text-sm font-semibold text-white bg-[#7e2562] rounded-sm hover:bg-[#681b50] active:scale-95 transition-all shadow-sm shadow-plum-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Staff
        </button>
      </div>

      <div className="bg-white shadow-sm border border-[#7e2562]/15 rounded-sm overflow-hidden">
        {usersLoading ? (
          <div className="p-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#7e2562]"/></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#7e2562]/10">
              <thead className="bg-[#faf6f9]/70">
                <tr>
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold text-[#7e2562] uppercase tracking-wider whitespace-nowrap">Staff Member</th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold text-[#7e2562] uppercase tracking-wider whitespace-nowrap">Role</th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold text-[#7e2562] uppercase tracking-wider whitespace-nowrap">Branch</th>
                  <th className="px-6 py-3.5 text-center text-[11px] font-bold text-[#7e2562] uppercase tracking-wider whitespace-nowrap">Status</th>
                  <th className="px-6 py-3.5 text-right text-[11px] font-bold text-[#7e2562] uppercase tracking-wider whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-100">
                {usersList.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((u: any) => (
                  <tr key={u.id} className="hover:bg-[#faf6f9]/40 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-neutral-900">{u.name}</div>
                      <div className="text-xs text-neutral-500 font-mono">{u.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1.5">
                        {(u.roles || []).map((r: any, idx: number) => (
                          <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider bg-[#faedf5] text-[#7e2562] border border-[#7e2562]/20">
                            {(r.role || r).replace(/_/g, ' ')}
                          </span>
                        ))}
                        {!(u.roles || []).length && u.role && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider bg-[#faedf5] text-[#7e2562] border border-[#7e2562]/20">
                            {u.role.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-neutral-600 font-medium">
                      {u.branch?.name || <span className="italic text-neutral-400">Headquarters</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {u.isActive ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider bg-[#f0fbf5] text-[#3cb976] border border-[#3cb976]/20">
                          <UserCheck className="w-3 h-3 mr-1"/> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider bg-[#fef5f2] text-[#e45e34] border border-[#e45e34]/20">
                          <UserX className="w-3 h-3 mr-1"/> Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                      <div className="flex justify-end items-center gap-3">
                        {u.id !== user?.id ? (
                          <button 
                            onClick={() => toggleStatus(u.id, u.isActive, u.name)} 
                            className={`font-semibold text-xs transition-colors ${u.isActive ? "text-[#e45e34] hover:text-[#c7451e]" : "text-[#3cb976] hover:text-[#2fa264]"}`}
                          >
                            {u.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        ) : (
                          <span className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider bg-neutral-100 px-1.5 py-0.5 rounded-sm">You</span>
                        )}
                        <button 
                          onClick={() => openModal(u)} 
                          className="text-neutral-400 hover:text-[#7e2562] p-1 transition-colors cursor-pointer"
                          title={u.id === user?.id ? "Edit your profile & password" : "Edit user details"}
                        >
                          <Settings className="w-4 h-4"/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          currentPage={currentPage}
          totalItems={usersList.length}
          pageSize={pageSize}
          onPageChange={(page) => setCurrentPage(page)}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
        />
      </div>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-sm shadow-xl w-full max-w-md p-6 border border-[#7e2562]/20 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                  <h3 className="text-lg font-bold text-neutral-900 flex items-center">
                    <Shield className="w-5 h-5 mr-2 text-[#7e2562]"/>
                    {editingUser ? (editingUser.id === user?.id ? 'Edit My Profile & Security' : 'Edit Staff Member') : 'Provision New Staff'}
                  </h3>
                  <div className="flex items-center gap-2">
                    {!editingUser && (
                      <button
                        type="button"
                        onClick={handleFillDemoUser}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#7e2562] bg-[#faedf5] hover:bg-[#f3dcee] border border-[#7e2562]/20 rounded-sm shadow-2xs transition-all cursor-pointer"
                        title="Fill sample staff data for staging"
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
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1">Full Name *</label>
                    <input 
                      required 
                      type="text" 
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})} 
                      className="block w-full px-3 py-2 border border-[#7e2562]/20 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-[#7e2562] focus:border-[#7e2562]" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1">Email Address *</label>
                    <input 
                      required 
                      type="email" 
                      value={formData.email} 
                      onChange={e => setFormData({...formData, email: e.target.value})} 
                      className="block w-full px-3 py-2 border border-[#7e2562]/20 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-[#7e2562] focus:border-[#7e2562]" 
                    />
                  </div>

                  {editingUser && (
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1">
                        New Password
                        <span className="text-[10px] font-normal lowercase text-neutral-400 ml-1.5">(optional — leave blank to keep unchanged)</span>
                      </label>
                      <input 
                        type="password" 
                        placeholder="Enter new password to update" 
                        value={formData.password} 
                        onChange={e => setFormData({...formData, password: e.target.value})} 
                        className="block w-full px-3 py-2 border border-[#7e2562]/20 rounded-sm text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-[#7e2562] focus:border-[#7e2562]" 
                      />
                    </div>
                  )}

                  {/* Role selection is visible when provisioning or when an admin is editing */}
                  {(!editingUser || user?.roles?.includes('SUPER_ADMIN') || user?.roles?.includes('ADMIN') || user?.roles?.includes('BRANCH_MANAGER')) && (
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1">System Role *</label>
                      <Dropdown
                        required
                        isMulti
                        value={formData.roles as unknown as string}
                        onChange={(val) => setFormData({...formData, roles: val as unknown as string[]})}
                        options={availableRoles}
                      />
                    </div>
                  )}

                  {formData.roles.some(r => ['BRANCH_MANAGER', 'BRANCH_INVENTORY', 'BRANCH_FRONT_OFFICE'].includes(r)) && (!user?.roles?.includes('BRANCH_MANAGER')) && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                      <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1">Assigned Branch *</label>
                      <Dropdown
                        required
                        value={formData.branchId}
                        onChange={(val) => setFormData({...formData, branchId: val})}
                        placeholder="Select branch..."
                        options={(branches || []).filter((b: any) => b.isActive !== false).map((b: any) => ({
                          value: b.id,
                          label: `${b.name} (${b.location || b.city || 'Store'})`
                        }))}
                      />
                    </motion.div>
                  )}

                  <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-neutral-100">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-neutral-700 bg-white border border-neutral-300 rounded-sm hover:bg-neutral-50 transition-colors cursor-pointer">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="flex items-center px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-[#7e2562] rounded-sm hover:bg-[#681b50] disabled:opacity-50 transition-colors shadow-sm shadow-plum-sm cursor-pointer">
                      {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Save Changes
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
