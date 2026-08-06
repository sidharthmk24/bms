"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApiData } from '@/hooks/useApiData';
import { api } from '@/lib/api';
import { Loader2, AlertCircle, Settings2, Save, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SettingsPage() {
  const { user } = useAuth();
  
  const { data: settings, loading, error, refetch } = useApiData<any[]>('/settings', []);
  
  // Edit State
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEditClick = (setting: any) => {
    setEditingKey(setting.key);
    // Convert value to string for editing (handle objects/arrays as JSON strings)
    setEditValue(typeof setting.value === 'object' ? JSON.stringify(setting.value, null, 2) : String(setting.value));
  };

  const handleSave = async (key: string) => {
    try {
      setIsSubmitting(true);
      
      // Attempt to parse back to JSON if it looks like an array or object
      let parsedValue: any = editValue;
      if (editValue.trim().startsWith('{') || editValue.trim().startsWith('[')) {
        try {
          parsedValue = JSON.parse(editValue);
        } catch (e) {
          alert('Invalid JSON format');
          setIsSubmitting(false);
          return;
        }
      } else if (!isNaN(Number(editValue)) && editValue.trim() !== '') {
        // Parse as number if applicable
        parsedValue = Number(editValue);
      } else if (editValue === 'true') {
        parsedValue = true;
      } else if (editValue === 'false') {
        parsedValue = false;
      }

      await api.patch(`/settings/${key}`, { value: parsedValue });
      
      setEditingKey(null);
      refetch(); // Reload settings
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update setting');
    } finally {
      setIsSubmitting(false);
    }
  };

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
  if ((!user?.roles?.includes(''))) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <Shield className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-500 max-w-md">
          System Settings are a restricted area. Only Super Administrators can view and modify global configuration parameters.
        </p>
      </div>
    );
  }

  const formatKeyName = (key: string) => {
    return key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div className="space-y-6">
      {/* Header section explaining what this page is */}
      <div className="bg-gradient-to-r from-indigo-900 to-purple-800 rounded-2xl p-8 text-white shadow-lg">
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-white/10 rounded-xl">
            <Settings2 className="w-8 h-8 text-purple-300" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">System Settings</h2>
            <p className="text-indigo-200 mt-2 max-w-2xl leading-relaxed">
              Global Configuration Variables control how the entire Bookstore Management System operates. 
              Changes here affect all branches globally. You can configure things like allowed payment modes, default restock thresholds, currency symbols, and invoice prefixes.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {(settings || []).map((setting) => (
          <div key={setting.key} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{formatKeyName(setting.key)}</h3>
                <p className="text-xs font-mono text-gray-500 mt-1">{setting.key}</p>
              </div>
              
              {editingKey !== setting.key ? (
                <button
                  onClick={() => handleEditClick(setting)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Edit
                </button>
              ) : (
                <div className="flex space-x-2">
                  <button
                    onClick={() => setEditingKey(null)}
                    className="text-gray-500 hover:text-gray-700 text-sm font-medium"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSave(setting.key)}
                    className="text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-md text-sm font-medium flex items-center"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
                    Save
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 bg-gray-50 rounded-lg border border-gray-100 p-4">
              <AnimatePresence mode="wait">
                {editingKey === setting.key ? (
                  <motion.div
                    key="editing"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {typeof setting.value === 'object' ? (
                      <textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-full h-32 p-2 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                      />
                    ) : (
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-full p-2 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    )}
                    <p className="text-xs text-blue-600 mt-2">
                      {typeof setting.value === 'object' ? 'Ensure you use valid JSON format (e.g., ["CASH", "UPI"]).' : 'Enter the new value.'}
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="viewing"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {typeof setting.value === 'object' ? (
                      <pre className="text-sm font-mono text-gray-800 whitespace-pre-wrap">
                        {JSON.stringify(setting.value, null, 2)}
                      </pre>
                    ) : (
                      <span className="text-lg font-medium text-gray-900">
                        {String(setting.value)}
                      </span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div className="mt-4 flex justify-between items-center text-xs text-gray-400">
              <span>Last updated: {new Date(setting.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
