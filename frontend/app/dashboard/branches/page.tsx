"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApiData } from '@/hooks/useApiData';
import { api } from '@/lib/api';
import { Loader2, Plus, Store, MapPin, Mail, Phone, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { Dropdown } from '@/components/Dropdown';

export default function BranchesManagementPage() {
  const { user } = useAuth();
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
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Branch Management</h2>
          <p className="text-sm text-gray-500">Manage physical bookstore locations across the enterprise.</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Branch
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full p-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600"/></div>
        ) : (
          branchesList.map((b: any) => (
            <div key={b.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-start">
                <div className="flex items-center">
                  <Store className={`w-5 h-5 mr-2 ${b.isActive !== false ? 'text-blue-600' : 'text-gray-400'}`} />
                  <h3 className={`font-bold ${b.isActive !== false ? 'text-gray-900' : 'text-gray-400 line-through'}`}>{b.name}</h3>
                  {b.isActive === false && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                      Inactive
                    </span>
                  )}
                </div>
                <button onClick={() => openModal(b)} className="text-gray-400 hover:text-blue-600">
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 space-y-3">
                <div className="flex items-start text-sm text-gray-600">
                  <Store className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-gray-400" />
                  <span>Type: <span className="font-medium text-gray-900">{b.type || 'STORE'}</span></span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="w-4 h-4 mr-2 flex-shrink-0 text-gray-400" />
                  <span>Code: <span className="font-medium text-gray-900">{b.code || 'N/A'}</span></span>
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 text-xs text-gray-500">
                Created: {new Date(b.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><Store className="w-5 h-5 mr-2 text-blue-600"/> {editingBranch ? 'Edit Branch' : 'Register New Branch'}</h3>
              
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Branch Name *</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Downtown Central" className="block w-full px-3 py-2 border rounded-lg sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Branch Code *</label>
                  <input required type="text" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} placeholder="e.g. DWTN-01" className="block w-full px-3 py-2 border rounded-lg sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input type="text" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} placeholder="e.g. Mumbai" className="block w-full px-3 py-2 border rounded-lg sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Full street address..." className="block w-full px-3 py-2 border rounded-lg sm:text-sm" rows={2} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Branch Type *</label>
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
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                      Active (Uncheck to deactivate branch)
                    </label>
                  </div>
                )}

                <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
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
