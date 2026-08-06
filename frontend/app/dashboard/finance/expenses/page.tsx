"use client";

import { useState } from 'react';
import { useApiData } from '@/hooks/useApiData';
import { api } from '@/lib/api';
import { Loader2, Plus, Trash2, ArrowLeft, ArrowUpDown } from 'lucide-react';
import Link from 'next/link';
import { Dropdown } from '@/components/Dropdown';

export default function ExpensesPage() {
  const [page, setPage] = useState(1);
  const { data: expensesResponse, loading: expLoading, error: expError, refetch } = useApiData<any>(`/finance/expenses?page=${page}&limit=10`);
  const expensesList = expensesResponse?.items || expensesResponse?.data || (Array.isArray(expensesResponse) ? expensesResponse : []);
  const { data: branches, loading: branchesLoading } = useApiData<any>('/branches');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedExpenses, setSelectedExpenses] = useState<string[]>([]);
  
  // Filters & Sorting state
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterBranch, setFilterBranch] = useState<string>('ALL');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const [formData, setFormData] = useState({
    amount: '',
    category: 'RENT',
    description: '',
    expenseDate: new Date().toISOString().split('T')[0],
    branchId: ''
  });

  const categories = [
    'RENT', 'SALARY', 'UTILITIES', 'SUPPLIES', 
    'MAINTENANCE', 'MARKETING', 'PROCUREMENT', 'OTHER'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/finance/expenses', {
        amount: Number(formData.amount),
        category: formData.category,
        description: formData.description,
        expenseDate: formData.expenseDate,
        branchId: formData.branchId || undefined
      });
      alert('Expense logged successfully');
      setFormData({ ...formData, amount: '', description: '' });
      refetch(); // refresh the list
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to log expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    try {
      await api.delete(`/finance/expenses/${id}`);
      refetch();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete expense');
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedExpenses.length} expenses?`)) return;
    try {
      await Promise.all(selectedExpenses.map(id => api.delete(`/finance/expenses/${id}`)));
      setSelectedExpenses([]);
      refetch();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete some expenses');
      refetch(); // Refresh to show remaining expenses if partial failure
    }
  };

  const filteredAndSortedExpenses = (expenses || [])
    .filter((exp: any) => filterCategory === 'ALL' || exp.category === filterCategory)
    .filter((exp: any) => filterBranch === 'ALL' || (filterBranch === 'HQ' ? !exp.branchId : exp.branchId === filterBranch))
    .sort((a: any, b: any) => {
      const dateA = new Date(a.expenseDate).getTime();
      const dateB = new Date(b.expenseDate).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link 
          href="/dashboard/finance"
          className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Expense Management</h2>
          <p className="text-sm text-gray-500">Log and track operational expenses for accurate P&L.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add Expense Form */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 lg:col-span-1 h-fit">
          <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Log New Expense</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.amount}
                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <Dropdown
                required
                value={formData.category}
                onChange={(value) => setFormData({ ...formData, category: value })}
                options={categories.map(cat => ({ label: cat, value: cat }))}
                placeholder="Select category"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
              <Dropdown
                value={formData.branchId}
                onChange={(value) => setFormData({ ...formData, branchId: value })}
                options={[
                  { label: 'HQ / General (No Branch)', value: '' },
                  ...(branches?.map((b: any) => ({ label: b.name, value: b.id })) || [])
                ]}
                placeholder="Select branch"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                required
                value={formData.expenseDate}
                onChange={e => setFormData({ ...formData, expenseDate: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                rows={2}
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="e.g. Monthly electricity bill for August"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Save Expense
            </button>
          </form>
        </div>

        {/* Expenses List */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden lg:col-span-2 flex flex-col max-h-[800px]">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="text-lg font-bold text-gray-900">Expense History</h3>
            
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              {/* Category Filter */}
              <div className="w-36">
                <Dropdown
                  value={filterCategory}
                  onChange={(val) => setFilterCategory(val)}
                  options={[
                    { label: 'All Categories', value: 'ALL' },
                    ...categories.map(c => ({ label: c, value: c }))
                  ]}
                  placeholder="Category"
                  selectClassName="!py-1.5"
                />
              </div>

              {/* Branch Filter */}
              <div className="w-40">
                <Dropdown
                  value={filterBranch}
                  onChange={(val) => setFilterBranch(val)}
                  options={[
                    { label: 'All Branches', value: 'ALL' },
                    { label: 'HQ (No Branch)', value: 'HQ' },
                    ...(branches?.map((b: any) => ({ label: b.name, value: b.id })) || [])
                  ]}
                  placeholder="Branch"
                  selectClassName="!py-1.5"
                />
              </div>

              {/* Sort Toggle */}
              {/* <button
                onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                className="flex items-center px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                title={`Sort ${sortOrder === 'desc' ? 'Ascending' : 'Descending'}`}
              >
                <ArrowUpDown className="w-4 h-4 mr-2 text-gray-400" />
                {sortOrder === 'desc' ? 'Newest' : 'Oldest'}
              </button> */}

              {selectedExpenses.length > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors shrink-0"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete ({selectedExpenses.length})
                </button>
              )}
            </div>
          </div>
          <div className="overflow-x-auto overflow-y-auto flex-1">
            <table className="w-full text-left text-sm text-gray-500 relative">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0 border-b">
                <tr>
                  <th scope="col" className="px-6 py-3 w-12">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={filteredAndSortedExpenses.length > 0 && selectedExpenses.length === filteredAndSortedExpenses.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedExpenses(filteredAndSortedExpenses.map((exp: any) => exp.id));
                        } else {
                          setSelectedExpenses([]);
                        }
                      }}
                    />
                  </th>
                  <th scope="col" className="px-6 py-3">Date</th>
                  <th scope="col" className="px-6 py-3">Category</th>
                  <th scope="col" className="px-6 py-3">Branch</th>
                  <th scope="col" className="px-6 py-3">Amount</th>
                  <th scope="col" className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {expLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
                    </td>
                  </tr>
                ) : filteredAndSortedExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No expenses match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedExpenses.map((exp: any) => (
                    <tr key={exp.id} className="bg-white border-b hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={selectedExpenses.includes(exp.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedExpenses([...selectedExpenses, exp.id]);
                            } else {
                              setSelectedExpenses(selectedExpenses.filter(id => id !== exp.id));
                            }
                          }}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {new Date(exp.expenseDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{exp.category}</span>
                          <span className="text-xs text-gray-500 truncate max-w-[150px]" title={exp.description}>
                            {exp.description}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {exp.branch?.name || <span className="text-gray-400 italic">HQ</span>}
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        ₹{Number(exp.amount).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDelete(exp.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Expense"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
