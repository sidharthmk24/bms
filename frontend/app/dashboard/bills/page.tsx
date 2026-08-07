"use client";

import { useState } from 'react';
import { useApiData } from '@/hooks/useApiData';
import { FileText, Loader2, Download, Search } from 'lucide-react';
import { generateBillPDF } from '@/lib/pdfUtils';

export default function BillsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  // Assuming the API supports pagination/search, for now fetch all or a default set
  const { data, loading, error } = useApiData<any>('/billing');

  // If the API returns paginated data, extract the array from 'items'
  const billsList = Array.isArray(data) ? data : (data?.items || []);

  const filteredBills = billsList.filter((bill: any) => 
    bill.billNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (bill.customerName && bill.customerName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const downloadPDF = (bill: any) => {
    generateBillPDF(bill, bill.items || [], bill.branch?.name || bill.branchId);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">All Bills</h2>
          <p className="text-sm text-gray-500">View and download historical invoices.</p>
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
                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full border border-blue-200">
                          {bill.paymentMode || 'CASH'}
                        </span>
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
