"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User as UserIcon, Lock, Mail, Shield, CheckCircle2, AlertCircle, Loader2, Eye, EyeOff, Store } from 'lucide-react';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileSettingsModal({ isOpen, onClose }: ProfileSettingsModalProps) {
  const { user, refreshUser } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  
  // Security Tab State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Status & loading
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user && isOpen) {
      setName(user.name || '');
      setEmail(user.email || '');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccessMessage(null);
      setErrorMessage(null);
    }
  }, [user, isOpen]);

  if (!isOpen || !user || typeof document === 'undefined') return null;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const payload: any = {
        name: name.trim(),
        email: email.trim(),
      };

      await api.patch(`/users/${user.id}`, payload);
      await refreshUser();
      setSuccessMessage('Profile details updated successfully!');
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (newPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('New passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (currentPassword) {
        await api.post('/auth/change-password', {
          currentPassword,
          newPassword,
        });
      } else {
        await api.patch(`/users/${user.id}`, {
          password: newPassword,
        });
      }

      setSuccessMessage('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to change password. Please check your current password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 0 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 0 }}
          transition={{ duration: 0.15 }}
          className="bg-white rounded-sm shadow-plum-xl border border-[#7e2562]/20 w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] my-auto"
        >
          {/* Modal Header */}
          <div className="px-6 py-4 border-b border-[#7e2562]/10 bg-[#faedf5]/50 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-sm bg-gradient-to-tr from-[#7e2562] to-[#9b3179] text-white flex items-center justify-center font-bold text-sm shadow-xs ring-1 ring-white">
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900 leading-tight">
                  Account Settings
                </h3>
                <p className="text-[11px] text-neutral-500 font-medium">
                  Manage your personal profile and security credentials
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-[#faedf5] rounded-sm transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-neutral-100 bg-[#faf6f9]/80 px-6 shrink-0">
            <button
              type="button"
              onClick={() => { setActiveTab('profile'); setErrorMessage(null); setSuccessMessage(null); }}
              className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'profile'
                  ? 'border-[#7e2562] text-[#7e2562] bg-white shadow-2xs'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800'
              }`}
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Profile Information</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('security'); setErrorMessage(null); setSuccessMessage(null); }}
              className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'security'
                  ? 'border-[#7e2562] text-[#7e2562] bg-white shadow-2xs'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Security & Password</span>
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 overflow-y-auto space-y-4 flex-1">
            {/* Feedback Notifications */}
            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2.5 p-3 rounded-sm bg-[#f0fbf5] border border-[#3cb976]/30 text-[#2fa264] text-xs font-semibold"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0 text-[#3cb976]" />
                <span>{successMessage}</span>
              </motion.div>
            )}

            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2.5 p-3 rounded-sm bg-[#fef5f2] border border-[#e45e34]/30 text-[#c7451e] text-xs font-semibold"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-[#e45e34]" />
                <span>{errorMessage}</span>
              </motion.div>
            )}

            {/* User Meta Summary */}
            <div className="p-3 bg-[#faf6f9] border border-[#7e2562]/10 rounded-sm flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold   tracking-wider text-neutral-500 block">Assigned Roles</span>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {(user.roles || [user.role || user.primaryRole]).map((r: string, idx: number) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-2 py-0.5 rounded-xs text-[10px] font-bold   tracking-wider bg-[#faedf5] text-[#7e2562] border border-[#7e2562]/20"
                    >
                      <Shield className="w-2.5 h-2.5 mr-1" />
                      {r.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>

              {user.branch && (
                <div className="text-right">
                  <span className="text-[10px] font-bold   tracking-wider text-neutral-500 block">Branch</span>
                  <span className="text-xs font-bold text-neutral-800 flex items-center gap-1 justify-end">
                    <Store className="w-3 h-3 text-neutral-500" />
                    {user.branch.name} ({user.branch.code})
                  </span>
                </div>
              )}
            </div>

            {/* Tab 1: Profile Information */}
            {activeTab === 'profile' && (
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold   tracking-wider text-neutral-700 mb-1">
                    Full Name *
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      required
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your full name"
                      className="block w-full pl-9 pr-3 py-2 border border-[#7e2562]/20 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-[#7e2562] focus:border-[#7e2562]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold   tracking-wider text-neutral-700 mb-1">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your.email@kairalibooks.com"
                      className="block w-full pl-9 pr-3 py-2 border border-[#7e2562]/20 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-[#7e2562] focus:border-[#7e2562]"
                    />
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-1">
                    You will use this email address to log in to your account.
                  </p>
                </div>

                <div className="flex justify-end gap-2.5 pt-4 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-bold   tracking-wider text-neutral-700 bg-white border border-neutral-300 rounded-sm hover:bg-neutral-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !name.trim() || !email.trim()}
                    className="flex items-center px-5 py-2 text-xs font-bold   tracking-wider text-white bg-[#7e2562] rounded-sm hover:bg-[#681b50] disabled:opacity-50 transition-all shadow-sm shadow-plum-sm cursor-pointer"
                  >
                    {isSubmitting && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
                    Save Profile
                  </button>
                </div>
              </form>
            )}

            {/* Tab 2: Security & Password */}
            {activeTab === 'security' && (
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold   tracking-wider text-neutral-700 mb-1">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter your current password"
                      className="block w-full px-3 py-2 pr-10 border border-[#7e2562]/20 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-[#7e2562] focus:border-[#7e2562]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold   tracking-wider text-neutral-700 mb-1">
                    New Password *
                  </label>
                  <div className="relative">
                    <input
                      required
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password (min. 6 characters)"
                      className="block w-full px-3 py-2 pr-10 border border-[#7e2562]/20 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-[#7e2562] focus:border-[#7e2562]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold   tracking-wider text-neutral-700 mb-1">
                    Confirm New Password *
                  </label>
                  <input
                    required
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="block w-full px-3 py-2 border border-[#7e2562]/20 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-[#7e2562] focus:border-[#7e2562]"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-4 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-bold   tracking-wider text-neutral-700 bg-white border border-neutral-300 rounded-sm hover:bg-neutral-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !newPassword || !confirmPassword}
                    className="flex items-center px-5 py-2 text-xs font-bold   tracking-wider text-white bg-[#7e2562] rounded-sm hover:bg-[#681b50] disabled:opacity-50 transition-all shadow-sm shadow-plum-sm cursor-pointer"
                  >
                    {isSubmitting && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
                    Update Password
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
