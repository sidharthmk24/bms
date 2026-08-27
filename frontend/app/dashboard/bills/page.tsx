"use client";

import { useState } from 'react';
import { useApiData } from '@/hooks/useApiData';
import { FileText, Loader2, Download, Search } from 'lucide-react';
import { generateBillPDF } from '@/lib/pdfUtils';
import * as XLSX from 'xlsx';
import { Dropdown } from '@/components/Dropdown';

export default function BillsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'this_week' | 'weekly' | 'this_month' | 'monthly' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

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
  queryParams.append('limit', '10000'); // fetch a large limit to export all bills
  if (startDate) queryParams.append('startDate', startDate);
  if (endDate) queryParams.append('endDate', endDate);

  const { data, loading, error } = useApiData<any>(`/billing?${queryParams.toString()}`);

  // Extract array from response envelope
  const billsList = Array.isArray(data) ? data : (data?.items || []);

  const filteredBills = billsList.filter((bill: any) => 
    bill.billNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (bill.customerName && bill.customerName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const downloadPDF = (bill: any) => {
    generateBillPDF(bill, bill.items || [], bill.branch?.name || bill.branchId);
  };

  const handleExport = () => {
    if (filteredBills.length === 0) {
      alert('No bills to export.');
      return;
    }
    
    try {
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
      
      const rows = filteredBills.map((bill: any) => {
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
            placeholder="Search bill number or customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full sm:w-80 pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Filter and Export Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
            <Dropdown
              value={dateFilter}
              onChange={(val) => setDateFilter(val as any)}
              options={[
                { value: 'all', label: 'All Time' },
                { value: 'this_week', label: 'This Week' },
                { value: 'weekly', label: 'Last 7 Days' },
                { value: 'this_month', label: 'This Month' },
                { value: 'monthly', label: 'Last 30 Days' },
                { value: 'custom', label: 'Custom Range' },
              ]}
              className="w-48"
            />

          {dateFilter === 'custom' && (
            <>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-gray-500 uppercase mb-1">Start Date</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-white border border-gray-300 rounded-lg text-sm px-3 py-1.5 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-gray-500 uppercase mb-1">End Date</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-white border border-gray-300 rounded-lg text-sm px-3 py-1.5 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto">
          <span className="text-xs text-gray-500 font-medium">
            Found {filteredBills.length} bill{filteredBills.length === 1 ? '' : 's'}
          </span>
          <button
            onClick={handleExport}
            disabled={filteredBills.length === 0}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 mr-2" />
            Export to Excel
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
              <tr>
                <th scope="col" className="px-6 py-4">Bill Number</th>
                <th scope="col" className="px-6 py-4">Date</th>
                <th scope="col" className="px-6 py-4">Customer</th>
                <th scope="col" className="px-6 py-4">Mode</th>
                <th scope="col" className="px-6 py-4 text-right">Total</th>
                <th scope="col" className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-red-500">
                    Failed to load bills.
                  </td>
                </tr>
              ) : filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    No bills found.
                  </td>
                </tr>
              ) : (
                filteredBills.map((bill: any) => (
                  <tr key={bill.id} className="bg-white border-b hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                      {bill.billNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(bill.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      {bill.customerName || '-'}
                    </td>
                    <td className="px-6 py-4">
                      {bill.status === 'COMPLETED' ? (
                        bill.paymentMode === 'CREDIT' ? (
                          <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded-full border border-purple-200">
                            CREDIT COPY
                          </span>
                        ) : (
                          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full border border-blue-200">
                            {bill.paymentMode || 'CASH'}
                          </span>
                        )
                      ) : (
                        <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full border border-red-200">
                          VOIDED
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-gray-900">
                      ₹{Number(bill.totalAmount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => downloadPDF(bill)}
                        className="inline-flex items-center justify-center p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors group"
                        title="Download PDF Invoice"
                      >
                        <Download className="w-5 h-5 group-hover:scale-110 transition-transform" />
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
  );
}
