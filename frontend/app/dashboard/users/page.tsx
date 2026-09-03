"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApiData } from '@/hooks/useApiData';
import { api } from '@/lib/api';
import { Loader2, Plus, Shield, UserX, UserCheck, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dropdown } from '@/components/Dropdown';
import { Pagination } from '@/components/Pagination';

export default function UsersManagementPage() {
  const { user } = useAuth();
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

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    roles: ['BRANCH_FRONT_OFFICE'],
    branchId: ''
  });

  const [editingUser, setEditingUser] = useState<any>(null);

  if (!canManageUsers) {
    return <div className="p-8 text-center text-red-600 font-bold">Access Denied. You do not have permission to manage users.</div>;
  }

  const availableRoles = (() => {
    if (user?.roles?.includes('SUPER_ADMIN')) {
      return [
        { value: 'SUPER_ADMIN', label: 'Super Admin (Full Access)' },
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
        name: userItem.name,
        email: userItem.email,
        roles: userItem.roles?.length ? userItem.roles.map((r: any) => r.role || r) : [userItem.role || 'BRANCH_FRONT_OFFICE'],
        branchId: userItem.branch?.id || ''
      });
    } else {
      setFormData({ 
        name: '', 
        email: '', 
        roles: user?.roles?.includes('BRANCH_MANAGER') ? ['BRANCH_FRONT_OFFICE'] : ['BRANCH_FRONT_OFFICE'], 
        branchId: user?.roles?.includes('BRANCH_MANAGER') ? (user.branchId || '') : '' 
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        primaryRole: formData.roles[0],
        branchId: user?.roles?.includes('BRANCH_MANAGER') 
          ? user.branchId 
          : (formData.roles.some(r => ['BRANCH_MANAGER', 'BRANCH_INVENTORY', 'BRANCH_FRONT_OFFICE'].includes(r)) ? formData.branchId : undefined)
      };

      if (editingUser) {
        await api.patch(`/users/${editingUser.id}`, { roles: payload.roles, branchId: payload.branchId });
        if (payload.branchId !== editingUser.branch?.id && !user?.roles?.includes('BRANCH_MANAGER')) {
          alert('Note: Branch reassignment via this UI might require backend support.');
        }
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

  const toggleStatus = async (id: string, currentStatus: boolean) => {
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
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">User & Staff Management</h2>
          <p className="text-sm text-gray-500">
            {user?.roles?.includes('BRANCH_MANAGER') 
              ? 'Provision accounts and assign roles for your branch staff.' 
              : 'Provision accounts and assign roles across the enterprise.'}
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Staff
        </button>
      </div>

      <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
        {usersLoading ? (
          <div className="p-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600"/></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Staff Member</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branch</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {usersList.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((u: any) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">{u.name}</div>
                      <div className="text-xs text-gray-500">{u.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {(u.roles || []).map((r: any, idx: number) => (
                          <span key={idx} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {(r.role || r).replace(/_/g, ' ')}
                          </span>
                        ))}
                        {!(u.roles || []).length && u.role && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {u.role.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {u.branch?.name || <span className="italic">Headquarters</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {u.isActive ? (
                        <span className="inline-flex items-center text-green-600 text-xs font-medium"><UserCheck className="w-4 h-4 mr-1"/> Active</span>
                      ) : (
                        <span className="inline-flex items-center text-red-600 text-xs font-medium"><UserX className="w-4 h-4 mr-1"/> Inactive</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      {u.id !== user?.id && (
                        <div className="flex justify-end space-x-3">
                          <button onClick={() => toggleStatus(u.id, u.isActive)} className={u.isActive ? "text-red-600 hover:text-red-900" : "text-green-600 hover:text-green-900"}>
                            {u.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button onClick={() => openModal(u)} className="text-gray-600 hover:text-gray-900"><Settings className="w-4 h-4"/></button>
                        </div>
                      )}
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

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><Shield className="w-5 h-5 mr-2 text-blue-600"/> {editingUser ? 'Edit Staff Role' : 'Provision New Staff'}</h3>
              
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input required disabled={!!editingUser} type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="block w-full px-3 py-2 border rounded-lg sm:text-sm disabled:bg-gray-100" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                  <input required disabled={!!editingUser} type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="block w-full px-3 py-2 border rounded-lg sm:text-sm disabled:bg-gray-100" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">System Role *</label>
                  <Dropdown
                    required
                    isMulti
                    value={formData.roles as unknown as string}
                    onChange={(val) => setFormData({...formData, roles: val as unknown as string[]})}
                    options={availableRoles}
                  />
                </div>

                {formData.roles.some(r => ['BRANCH_MANAGER', 'BRANCH_INVENTORY', 'BRANCH_FRONT_OFFICE'].includes(r)) && (!user?.roles?.includes('BRANCH_MANAGER')) && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Branch *</label>
                    <Dropdown
                      required
                      value={formData.branchId}
                      onChange={(val) => setFormData({...formData, branchId: val})}
                      placeholder="Select branch..."
                      options={(branches || []).filter((b: any) => b.isActive !== false).map((b: any) => ({
                        value: b.id,
                        label: `${b.name} (${b.location})`
                      }))}
                    />
                  </motion.div>
                )}

                <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                    {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Save User
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
