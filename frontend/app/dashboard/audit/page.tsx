"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApiData } from '@/hooks/useApiData';
import { Loader2, AlertCircle, Search, Shield, History, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AuditLogPage() {
  const { user } = useAuth();
  
  // Only SUPER_ADMIN is allowed to view audit logs in the backend
  const { data: logs, loading, error } = useApiData<any[]>('/audit-logs?limit=200', []);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<any>(null);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
        <AlertCircle className="w-5 h-5 mr-2" />
        {error}
      </div>
    );
  }

  // Fallback check if user is not super admin
  if (!user?.roles?.includes('SUPER_ADMIN')) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <Shield className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-500 max-w-md">
          The Audit Log is a restricted area. Only Super Administrators can view system-wide activity and security trails.
        </p>
      </div>
    );
  }

  const filteredLogs = (logs || []).filter((log: any) => 
    log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.entityType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.ipAddress?.includes(searchTerm)
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  const getActionColor = (action: string) => {
    if (action.includes('CREATED') || action.includes('ADDED') || action.includes('APPROVED')) return 'bg-green-100 text-green-800';
    if (action.includes('DELETED') || action.includes('REJECTED') || action.includes('DEACTIVATED')) return 'bg-red-100 text-red-800';
    if (action.includes('UPDATED') || action.includes('ADJUSTED')) return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Header section explaining what this page is */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-8 text-white shadow-lg">
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-white/10 rounded-xl">
            <History className="w-8 h-8 text-blue-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">System Audit Log</h2>
            <p className="text-slate-300 mt-2 max-w-2xl leading-relaxed">
              The Audit Log acts as the central security and accountability trail for the entire Bookstore Management System. 
              It securely records every critical action-such as creating users, adjusting stock, or fulfilling orders—along with the exact time, the user responsible, their IP address, and a snapshot of the data before and after the change.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity Trail</h3>
          <p className="text-sm text-gray-500">Showing the latest 200 system events.</p>
        </div>
        <div className="mt-4 sm:mt-0 w-full sm:w-80">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search actions, entities, users, IPs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
        </div>
      </div>

      <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entity</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP Address</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(log.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold mr-3">
                        {log.user?.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{log.user?.name || 'System'}</div>
                        <div className="text-xs text-gray-500">{log.user?.role || 'SYSTEM_PROCESS'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                      {log.action.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{log.entityType}</div>
                    <div className="text-xs text-gray-500 font-mono">{log.entityId?.substring(0, 8)}...</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono text-xs">
                    {log.ipAddress}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="text-blue-600 hover:text-blue-900 flex items-center justify-end w-full group"
                    >
                      View Data
                      <ArrowRight className="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <History className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p>No audit logs found matching your criteria.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      <AnimatePresence>
        {selectedLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Audit Record Details</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Record ID: <span className="font-mono text-xs">{selectedLog.id}</span>
                  </p>
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-gray-400 hover:text-gray-500 bg-gray-200/50 hover:bg-gray-200 p-2 rounded-full transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Context</h4>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between"><dt className="text-gray-500">Action:</dt> <dd className="font-medium">{selectedLog.action}</dd></div>
                      <div className="flex justify-between"><dt className="text-gray-500">Entity:</dt> <dd className="font-medium">{selectedLog.entityType}</dd></div>
                      <div className="flex justify-between"><dt className="text-gray-500">Entity ID:</dt> <dd className="font-mono text-xs">{selectedLog.entityId}</dd></div>
                      <div className="flex justify-between"><dt className="text-gray-500">Time:</dt> <dd>{formatDate(selectedLog.createdAt)}</dd></div>
                    </dl>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Actor</h4>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between"><dt className="text-gray-500">Name:</dt> <dd className="font-medium">{selectedLog.user?.name}</dd></div>
                      <div className="flex justify-between"><dt className="text-gray-500">Email:</dt> <dd>{selectedLog.user?.email}</dd></div>
                      <div className="flex justify-between"><dt className="text-gray-500">Role:</dt> <dd>{selectedLog.user?.role}</dd></div>
                      <div className="flex justify-between"><dt className="text-gray-500">IP Address:</dt> <dd className="font-mono text-xs">{selectedLog.ipAddress}</dd></div>
                    </dl>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center">
                      <span className="w-2 h-2 rounded-full bg-red-400 mr-2"></span>
                      Before State
                    </h4>
                    <div className="bg-slate-900 rounded-xl p-4 overflow-x-auto">
                      <pre className="text-xs text-green-400 font-mono">
                        {selectedLog.beforeJson ? JSON.stringify(selectedLog.beforeJson, null, 2) : 'null'}
                      </pre>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center">
                      <span className="w-2 h-2 rounded-full bg-green-400 mr-2"></span>
                      After State
                    </h4>
                    <div className="bg-slate-900 rounded-xl p-4 overflow-x-auto">
                      <pre className="text-xs text-blue-400 font-mono">
                        {selectedLog.afterJson ? JSON.stringify(selectedLog.afterJson, null, 2) : 'null'}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
