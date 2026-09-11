"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApiData } from '@/hooks/useApiData';
import { FileText, Loader2, Download, Search, RotateCcw, Filter } from 'lucide-react';
import { generateBillPDF } from '@/lib/pdfUtils';
import * as XLSX from 'xlsx';
import { Dropdown } from '@/components/Dropdown';
import { Pagination } from '@/components/Pagination';
import { matchKeywords } from '@/lib/searchUtils';

export default function BillsPage() {
  const { user } = useAuth();
  const isSuperAdminOrAdmin = user?.roles?.some((r: string) => ['SUPER_ADMIN', 'ADMIN', 'FINANCE', 'CENTRAL_INVENTORY_MANAGER'].includes(r)) || false;

  const { data: branchesResponse } = useApiData<any>('/branches');
  const branchesList: any[] = Array.isArray(branchesResponse) ? branchesResponse : (branchesResponse?.data || []);

  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'this_week' | 'weekly' | 'this_month' | 'monthly' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  // Filter States
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [isExporting, setIsExporting] = useState(false);

  const getDateRange = (filter: string, customStart?: string, customEnd?: string) => {
    const now = new Date();
    let start = new Date();
    let end = new Date();
    end.setHours(23, 59, 59, 999);

    switch (filter) {
      case 'weekly': // Last 7 days
        start.setDate(now.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        break;
      case 'this_week': { // Monday to now
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        start.setDate(diff);
        start.setHours(0, 0, 0, 0);
        break;
      }
      case 'monthly': // Last 30 days
        start.setDate(now.getDate() - 30);
        start.setHours(0, 0, 0, 0);
        break;
      case 'this_month': // 1st of this month
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        start.setHours(0, 0, 0, 0);
        break;
      case 'all':
        return { startDate: '', endDate: '' };
      case 'custom':
        if (customStart) {
          const s = new Date(customStart);
          s.setHours(0, 0, 0, 0);
          start = s;
        } else {
          start = new Date('2000-01-01');
        }
        if (customEnd) {
          const e = new Date(customEnd);
          e.setHours(23, 59, 59, 999);
          end = e;
        }
        break;
      default:
        return { startDate: '', endDate: '' };
    }

    return {
      startDate: start.toISOString(),
      endDate: end.toISOString()
    };
  };

  const { startDate, endDate } = getDateRange(dateFilter, customStartDate, customEndDate);
  
  const queryParams = new URLSearchParams();
  queryParams.append('page', String(currentPage));
  queryParams.append('limit', String(pageSize));
  if (searchTerm.trim()) queryParams.append('search', searchTerm.trim());
  if (selectedBranch !== 'all') queryParams.append('branchId', selectedBranch);
  if (selectedPaymentMode !== 'all') queryParams.append('paymentMode', selectedPaymentMode);
  if (selectedSource !== 'all') queryParams.append('source', selectedSource);
  if (selectedStatus !== 'all') queryParams.append('status', selectedStatus);
  if (startDate) queryParams.append('startDate', startDate);
  if (endDate) queryParams.append('endDate', endDate);

  const { data, loading, error } = useApiData<any>(`/billing?${queryParams.toString()}`);

  // Extract array and total count from server response envelope
  const billsList: any[] = data?.items || (Array.isArray(data) ? data : []);
  const totalBillsCount: number = data?.total ?? billsList.length;

  const resetAllFilters = () => {
    setDateFilter('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setSelectedBranch('all');
    setSelectedPaymentMode('all');
    setSelectedSource('all');
    setSelectedStatus('all');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const isAnyFilterActive = 
    dateFilter !== 'all' || 
    selectedBranch !== 'all' || 
    selectedPaymentMode !== 'all' || 
    selectedSource !== 'all' || 
    selectedStatus !== 'all' || 
    searchTerm.trim() !== '';

  const downloadPDF = (bill: any) => {
    generateBillPDF(bill, bill.items || [], bill.branch || bill.branchId);
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const exportParams = new URLSearchParams();
      exportParams.append('limit', '10000');
      if (searchTerm.trim()) exportParams.append('search', searchTerm.trim());
      if (selectedBranch !== 'all') exportParams.append('branchId', selectedBranch);
      if (selectedPaymentMode !== 'all') exportParams.append('paymentMode', selectedPaymentMode);
      if (selectedSource !== 'all') exportParams.append('source', selectedSource);
      if (selectedStatus !== 'all') exportParams.append('status', selectedStatus);
      if (startDate) exportParams.append('startDate', startDate);
      if (endDate) exportParams.append('endDate', endDate);

      const res = await fetch(`/api/v1/billing?${exportParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
          'Content-Type': 'application/json'
        }
      });
      const json = await res.json();
      const exportData = json?.data?.items || (Array.isArray(json?.data) ? json?.data : billsList);

      if (!exportData || exportData.length === 0) {
        alert('No bills to export.');
        return;
      }
      
      const headers = [
        'Bill Number',
        'Date & Time',
        'Branch',
        'Customer Name',
        'Customer Phone',
        'Payment Mode',
        'Status',
        'Subtotal (INR)',
        'Discount (INR)',
        'Total Amount (INR)',
        'Items Count',
        'Books Sold Details',
        'Issued By'
      ];
      
      const rows = exportData.map((bill: any) => {
        const date = new Date(bill.createdAt).toLocaleString();
        const branch = bill.branch?.name || bill.branchId || 'HQ / General';
        const customer = bill.customerName || 'Walk-in Customer';
        const phone = bill.customerPhone || 'N/A';
        const payment = bill.paymentMode || 'CASH';
        const status = bill.status === 'COMPLETED' ? 'COMPLETED' : 'VOIDED';
        const subtotal = Number(bill.subTotal || 0);
        const discount = Number(bill.discount || 0);
        const total = Number(bill.totalAmount || 0);
        
        const itemsCount = bill.items?.length || 0;
        const booksDetails = (bill.items || []).map((item: any) => {
          const title = item.title || item.book?.title || 'Unknown Book';
          return `${title} (x${item.quantity})`;
        }).join(', ');
        
        const issuedBy = bill.createdBy?.name || 'System';
        
        return [
          bill.billNumber,
          date,
          branch,
          customer,
          phone,
          payment,
          status,
          subtotal,
          discount,
          total,
          itemsCount,
          booksDetails,
          issuedBy
        ];
      });
      
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      
      worksheet['!cols'] = [
        { wch: 20 }, // Bill Number
        { wch: 25 }, // Date & Time
        { wch: 20 }, // Branch
        { wch: 25 }, // Customer Name
        { wch: 15 }, // Customer Phone
        { wch: 15 }, // Payment Mode
        { wch: 12 }, // Status
        { wch: 15 }, // Subtotal
        { wch: 15 }, // Discount
        { wch: 18 }, // Total Amount
        { wch: 12 }, // Items Count
        { wch: 60 }, // Books Sold Details
        { wch: 20 }  // Issued By
      ];
      
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Bills');
      
      const fileName = `bills_export_${dateFilter}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export bills to Excel');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">All Bills</h2>
          <p className="text-sm text-gray-500">View, filter, and export historical invoices.</p>
        </div>
        <div className="mt-4 sm:mt-0 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search bill #, customer, book, keywords..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="block w-full sm:w-80 pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Filter and Export Bar */}
      <div className="bg-white p-4 rounded-sm border border-[#7e2562]/15 shadow-plum-sm flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* 1. Date Range Dropdown */}
          <div className="w-44">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">Date Range</label>
            <Dropdown
              value={dateFilter}
              onChange={(val) => {
                setDateFilter(val as any);
                setCurrentPage(1);
              }}
              options={[
                { value: 'all', label: 'All Time' },
                { value: 'this_week', label: 'This Week' },
                { value: 'weekly', label: 'Last 7 Days' },
                { value: 'this_month', label: 'This Month' },
                { value: 'monthly', label: 'Last 30 Days' },
                { value: 'custom', label: 'Custom Range' },
              ]}
              className="w-full"
            />
          </div>

          {/* 2. Branch Dropdown */}
          <div className="w-44">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">Branch</label>
            <Dropdown
              value={selectedBranch}
              onChange={(val) => {
                setSelectedBranch(val as string);
                setCurrentPage(1);
              }}
              options={[
                { value: 'all', label: 'All Branches' },
                ...branchesList.map((b: any) => ({
                  value: b.id,
                  label: b.name || b.code || 'Branch',
                })),
              ]}
              className="w-full"
            />
          </div>

          {/* 3. Source / Type Dropdown */}
          <div className="w-48">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">Bill Source</label>
            <Dropdown
              value={selectedSource}
              onChange={(val) => {
                setSelectedSource(val as string);
                setCurrentPage(1);
              }}
              options={[
                { value: 'all', label: 'All Bill Sources' },
                { value: 'STORE', label: 'Store Counter Sale' },
                { value: 'EXHIBITION', label: 'Exhibition Reconciliation' },
              ]}
              className="w-full"
            />
          </div>

          {/* 4. Payment Mode Dropdown */}
          <div className="w-40">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">Payment Mode</label>
            <Dropdown
              value={selectedPaymentMode}
              onChange={(val) => {
                setSelectedPaymentMode(val as string);
                setCurrentPage(1);
              }}
              options={[
                { value: 'all', label: 'All Modes' },
                { value: 'CASH', label: 'Cash' },
                { value: 'UPI', label: 'UPI' },
                { value: 'CREDIT', label: 'Credit Copy' },
              ]}
              className="w-full"
            />
          </div>

          {/* 5. Status Dropdown */}
          <div className="w-36">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">Status</label>
            <Dropdown
              value={selectedStatus}
              onChange={(val) => {
                setSelectedStatus(val as string);
                setCurrentPage(1);
              }}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'COMPLETED', label: 'Completed' },
                { value: 'VOIDED', label: 'Voided' },
              ]}
              className="w-full"
            />
          </div>

          {/* Custom Date Inputs if Custom Range is selected */}
          {dateFilter === 'custom' && (
            <>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Start Date</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => {
                    setCustomStartDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-neutral-300 rounded-sm text-xs px-3 py-1.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">End Date</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => {
                    setCustomEndDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-neutral-300 rounded-sm text-xs px-3 py-1.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                />
              </div>
            </>
          )}

          {/* Reset Filters button */}
          {isAnyFilterActive && (
            <div className="self-end pb-0.5">
              <button
                type="button"
                onClick={resetAllFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#7e2562] bg-[#faedf5] hover:bg-[#f6dded] border border-[#7e2562]/20 rounded-sm transition-colors cursor-pointer"
                title="Reset all filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            </div>
          )}
        </div>

        {/* Bottom bar of filter card: Count & Export */}
        <div className="flex items-center justify-between pt-3 border-t border-[#7e2562]/10">
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-600 font-medium">
              Showing <strong className="text-neutral-900 font-bold">{billsList.length}</strong> of <strong className="text-neutral-900 font-bold">{totalBillsCount}</strong> bill{totalBillsCount === 1 ? '' : 's'}
            </span>
            {isAnyFilterActive && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-sm border border-amber-200">
                <Filter className="w-3 h-3" /> Filtered
              </span>
            )}
          </div>

          <button
            onClick={handleExport}
            disabled={isExporting || totalBillsCount === 0}
            className="apple-button inline-flex items-center px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-primary rounded-sm hover:bg-primary-hover shadow-plum-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            {isExporting ? 'Exporting...' : 'Export to Excel'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-sm border border-[#7e2562]/15 shadow-plum-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs font-bold uppercase tracking-wider text-muted-foreground bg-[#faf6f9]/60 border-b border-[#7e2562]/10">
              <tr>
                <th scope="col" className="px-6 py-4 whitespace-nowrap">Bill Number</th>
                <th scope="col" className="px-6 py-4 whitespace-nowrap">Date</th>
                <th scope="col" className="px-6 py-4 whitespace-nowrap">Customer</th>
                <th scope="col" className="px-6 py-4 whitespace-nowrap">Mode</th>
                <th scope="col" className="px-6 py-4 text-right whitespace-nowrap">Total</th>
                <th scope="col" className="px-6 py-4 text-center whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#7e2562]/8">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-danger font-semibold">
                    Failed to load bills.
                  </td>
                </tr>
              ) : billsList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    No bills found.
                  </td>
                </tr>
              ) : (
                billsList.map((bill: any) => (
                  <tr key={bill.id} className="bg-white hover:bg-[#faf6f9]/60 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-primary whitespace-nowrap">
                      {bill.billNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-muted-foreground text-xs">
                      {new Date(bill.createdAt).toLocaleString()}
                    </td>
                    
                    <td className="px-6 py-4 font-medium text-foreground">
                      <div className="flex flex-col">
                        <span>{bill.customerName || 'Walk-in Customer'}</span>
                        {bill.exhibitionId && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#7e2562] bg-[#faedf5] px-2 py-0.5 rounded-sm w-fit mt-1 border border-[#7e2562]/20">
                            Exhibition Reconciliation
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {bill.status === 'COMPLETED' ? (
                        bill.paymentMode === 'CREDIT' ? (
                          <span className="bg-primary/10 text-primary text-xs font-bold px-2.5 py-0.5 rounded-full border border-primary/20">
                            CREDIT COPY
                          </span>
                        ) : (
                          <span className="bg-success/10 text-success text-xs font-bold px-2.5 py-0.5 rounded-full border border-success/20">
                            {bill.paymentMode || 'CASH'}
                          </span>
                        )
                      ) : (
                        <span className="bg-danger/10 text-danger text-xs font-bold px-2.5 py-0.5 rounded-full border border-danger/20">
                          VOIDED
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-foreground">
                      ₹{Number(bill.totalAmount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => downloadPDF(bill)}
                        className="inline-flex items-center justify-center p-2 text-primary hover:bg-[#faedf5] rounded-sm transition-colors group cursor-pointer"
                        title="Download PDF Invoice"
                      >
                        <Download className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalItems={totalBillsCount}
          pageSize={pageSize}
          onPageChange={(page) => setCurrentPage(page)}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
        />
      </div>
    </div>
  );
}
