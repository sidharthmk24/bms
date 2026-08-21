"use client";

import { useState } from 'react';
import { useApiData } from '@/hooks/useApiData';
import { api } from '@/lib/api';
import { Loader2, Plus, Trash2, ArrowLeft, ArrowUpDown, Download, X } from 'lucide-react';
import Link from 'next/link';
import { Dropdown } from '@/components/Dropdown';
import * as XLSX from 'xlsx';

export default function ExpensesPage() {
  const [page, setPage] = useState(1);
  const { data: expensesResponse, loading: expLoading, error: expError, refetch } = useApiData<any>(`/finance/expenses?page=${page}&limit=10`);
  const expensesList = expensesResponse?.items || expensesResponse?.data || (Array.isArray(expensesResponse) ? expensesResponse : []);
  const { data: branches, loading: branchesLoading } = useApiData<any>('/branches');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedExpenses, setSelectedExpenses] = useState<string[]>([]);
  
  // Export state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  
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

  const filteredAndSortedExpenses = (expensesList || [])
    .filter((exp: any) => filterCategory === 'ALL' || exp.category === filterCategory)
    .filter((exp: any) => filterBranch === 'ALL' || (filterBranch === 'HQ' ? !exp.branchId : exp.branchId === filterBranch))
    .sort((a: any, b: any) => {
      const dateA = new Date(a.expenseDate).getTime();
      const dateB = new Date(b.expenseDate).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsExporting(true);
    try {
      let url = '/finance/expenses?';
      if (exportStartDate) url += `startDate=${exportStartDate}&`;
      if (exportEndDate) url += `endDate=${exportEndDate}`;
      
      const res = await api.get(url);
      const data = res.data?.data || res.data || [];
      
      if (!Array.isArray(data) || data.length === 0) {
        alert('No expenses found for the selected date range.');
        return;
      }
      
      const headers = ['Date', 'Category', 'Branch', 'Amount (INR)', 'Entered By', 'Description'];
      const rows = data.map((exp: any) => {
        const date = exp.expenseDate ? exp.expenseDate.split('T')[0] : '';
        const cat = exp.category || '';
        const branch = exp.branch?.name || 'HQ / General';
        const amount = exp.amount || 0;
        const user = exp.enteredBy?.name || 'System';
        const desc = exp.description || '';
        return [date, cat, branch, amount, user, desc];
      });
      
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      
      // Set column widths to prevent '#######' on dates and text truncation
      worksheet['!cols'] = [
        { wch: 15 }, // Date
        { wch: 15 }, // Category
        { wch: 25 }, // Branch
        { wch: 15 }, // Amount (INR)
        { wch: 20 }, // Entered By
        { wch: 50 }, // Description
      ];
      
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Expenses');
      
      XLSX.writeFile(workbook, `expenses_export_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      setShowExportModal(false);
    } catch (err) {
      alert('Failed to export expenses');
    } finally {
      setIsExporting(false);
    }
  };

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
                  ...(branches?.filter((b: any) => b.isActive !== false).map((b: any) => ({ label: b.name, value: b.id })) || [])
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
                    ...(branches?.filter((b: any) => b.isActive !== false).map((b: any) => ({ label: b.name, value: b.id })) || [])
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

              <button
                onClick={() => setShowExportModal(true)}
                className="flex items-center px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors shrink-0"
              >
                <Download className="w-4 h-4 mr-2" />
                Export to Excel
              </button>
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

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">Export Expenses</h3>
              <button onClick={() => setShowExportModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleExport} className="p-6">
              <div className="space-y-4">
                <p className="text-sm text-gray-500">
                  Select a date range to export your expenses to an Excel-compatible CSV file. Leave blank to export all available data.
                </p>
                
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={exportStartDate}
                      onChange={e => setExportStartDate(e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={exportEndDate}
                      onChange={e => setExportEndDate(e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 pt-2">
                  <button type="button" onClick={() => {
                    const today = new Date();
                    setExportEndDate(today.toISOString().split('T')[0]);
                    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                    setExportStartDate(firstDay.toISOString().split('T')[0]);
                  }} className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full transition-colors">
                    This Month
                  </button>
                  <button type="button" onClick={() => {
                    const today = new Date();
                    const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
                    setExportEndDate(lastDay.toISOString().split('T')[0]);
                    const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                    setExportStartDate(firstDay.toISOString().split('T')[0]);
                  }} className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full transition-colors">
                    Last Month
                  </button>
                  <button type="button" onClick={() => {
                    const today = new Date();
                    setExportEndDate(today.toISOString().split('T')[0]);
                    const firstDay = new Date(today.getFullYear(), 0, 1);
                    setExportStartDate(firstDay.toISOString().split('T')[0]);
                  }} className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full transition-colors">
                    This Year
                  </button>
                </div>
              </div>
              
              <div className="mt-8 pt-4 border-t border-gray-100 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isExporting}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                >
                  {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                  Download Excel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
