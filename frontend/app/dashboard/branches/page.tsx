"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import { useApiData } from '@/hooks/useApiData';
import { api } from '@/lib/api';
import { Loader2, Plus, Store, MapPin, Mail, Phone, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { Dropdown } from '@/components/Dropdown';

export default function BranchesManagementPage() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const isSuperAdmin = user?.roles?.includes('SUPER_ADMIN') || user?.roles?.includes('ADMIN');

  const { data: branchesResponse, loading } = useApiData<any>('/branches', []);
  const branchesList = branchesResponse?.data || branchesResponse || [];

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'STORE',
    city: '',
    address: '',
    isActive: true
  });

  if (!isSuperAdmin) {
    return <div className="p-8 text-center text-red-600 font-bold">Access Denied. Super Admins only.</div>;
  }

  const openModal = (branch?: any) => {
    setEditingBranch(branch || null);
    if (branch) {
      setFormData({
        name: branch.name,
        code: branch.code || '',
        type: branch.type || 'STORE',
        city: branch.city || '',
        address: branch.address || '',
        isActive: branch.isActive !== false // defaults to true
      });
    } else {
      setFormData({ name: '', code: '', type: 'STORE', city: '', address: '', isActive: true });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await confirm({
      title: editingBranch ? "Update Branch" : "Create New Branch",
      message: editingBranch 
        ? `Are you sure you want to update the details for "${formData.name}"?`
        : `Are you sure you want to create new branch "${formData.name}" (${formData.type})?`,
      confirmText: editingBranch ? "Yes, Update" : "Yes, Create Branch",
      cancelText: "No, Cancel",
      variant: "primary",
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
        isActive: formData.isActive
      };

      if (editingBranch) {
        await api.patch(`/branches/${editingBranch.id}`, payload);
      } else {
        await api.post('/branches', payload);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Save failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900">Branch Management</h2>
          <p className="text-sm text-neutral-500">Manage physical bookstore locations across the enterprise.</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center px-4 py-2 text-sm font-semibold text-white bg-[#7e2562] rounded-sm hover:bg-[#681b50] active:scale-95 transition-all shadow-sm shadow-plum-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Branch
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full p-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#7e2562]"/></div>
        ) : (
          branchesList.map((b: any) => (
            <div key={b.id} className="bg-white rounded-sm shadow-sm border border-[#7e2562]/15 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-4 border-b border-[#7e2562]/10 bg-[#faf6f9]/70 flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-sm bg-[#faedf5] flex items-center justify-center text-[#7e2562]">
                    <Store className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className={`font-bold text-sm ${b.isActive !== false ? 'text-neutral-900' : 'text-neutral-400 line-through'}`}>{b.name}</h3>
                    <span className="text-[11px] font-mono text-neutral-500">{b.code || 'N/A'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {b.isActive !== false ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider bg-[#f0fbf5] text-[#3cb976] border border-[#3cb976]/20">
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider bg-[#fef5f2] text-[#e45e34] border border-[#e45e34]/20">
                      Inactive
                    </span>
                  )}
                  <button onClick={() => openModal(b)} className="text-neutral-400 hover:text-[#7e2562] p-1 transition-colors">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="p-4 space-y-2.5 text-xs text-neutral-600">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Type</span>
                  <span className="font-semibold text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded-sm">{b.type || 'STORE'}</span>
                </div>
                {b.city && (
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500">City</span>
                    <span className="font-medium text-neutral-800">{b.city}</span>
                  </div>
                )}
                {b.address && (
                  <div className="text-[11px] text-neutral-500 pt-1 border-t border-neutral-100 line-clamp-2">
                    {b.address}
                  </div>
                )}
              </div>
              <div className="bg-[#faf6f9]/40 px-4 py-2.5 border-t border-[#7e2562]/10 text-[11px] text-neutral-500">
                Created: {new Date(b.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-sm shadow-xl w-full max-w-md p-6 border border-[#7e2562]/20">
              <h3 className="text-lg font-bold text-neutral-900 mb-4 flex items-center"><Store className="w-5 h-5 mr-2 text-[#7e2562]"/> {editingBranch ? 'Edit Branch' : 'Register New Branch'}</h3>
              
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1">Branch Name *</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Downtown Central" className="block w-full px-3 py-2 border border-[#7e2562]/20 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-[#7e2562] focus:border-[#7e2562]" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1">Branch Code *</label>
                  <input required type="text" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} placeholder="e.g. DWTN-01" className="block w-full px-3 py-2 border border-[#7e2562]/20 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-[#7e2562] focus:border-[#7e2562]" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1">City</label>
                  <input type="text" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} placeholder="e.g. Mumbai" className="block w-full px-3 py-2 border border-[#7e2562]/20 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-[#7e2562] focus:border-[#7e2562]" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1">Address</label>
                  <textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Full street address..." className="block w-full px-3 py-2 border border-[#7e2562]/20 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-[#7e2562] focus:border-[#7e2562]" rows={2} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1">Branch Type *</label>
                  <Dropdown
                    value={formData.type}
                    onChange={(val) => setFormData({...formData, type: val})}
                    options={[
                      { value: 'STORE', label: 'Store' },
                      { value: 'WAREHOUSE', label: 'Warehouse' }
                    ]}
                  />
                </div>

                {editingBranch && (
                  <div className="flex items-center mt-4">
                    <input
                      id="isActive"
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={e => setFormData({...formData, isActive: e.target.checked})}
                      className="h-4 w-4 text-[#7e2562] focus:ring-[#7e2562] border-neutral-300 rounded-sm"
                    />
                    <label htmlFor="isActive" className="ml-2 block text-xs font-medium text-neutral-800">
                      Active (Uncheck to deactivate branch)
                    </label>
                  </div>
                )}

                <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-neutral-100">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-neutral-700 bg-white border border-neutral-300 rounded-sm hover:bg-neutral-50 transition-colors">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="flex items-center px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-[#7e2562] rounded-sm hover:bg-[#681b50] disabled:opacity-50 transition-colors shadow-sm shadow-plum-sm">
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
