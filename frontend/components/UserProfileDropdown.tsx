"use client";

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { User as UserIcon, LogOut, ChevronDown, Shield, Settings, Store, Sparkles } from 'lucide-react';
import ProfileSettingsModal from '@/components/ProfileSettingsModal';

export default function UserProfileDropdown() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  if (!user) return null;

  const initials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  const roleLabel = (user.role || user.primaryRole || '').replace(/_/g, ' ').toLowerCase();

  return (
    <>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2.5 pl-1.5 pr-2.5 py-1 bg-white border rounded-sm shadow-xs backdrop-blur-md transition-all duration-200 text-left cursor-pointer select-none ${
            isOpen
              ? 'border-[#7e2562] shadow-plum-sm ring-2 ring-[#7e2562]/10'
              : 'border-[#7e2562]/15 hover:shadow-plum-sm hover:border-primary/40'
          }`}
          title="Account Profile & Settings"
        >
          {/* Avatar Icon */}
          <div className="w-7 h-7 rounded-sm bg-gradient-to-tr from-[#7e2562] via-[#9b3179] to-[#681b50] text-white flex items-center justify-center font-bold text-xs shadow-xs ring-1 ring-white/80 shrink-0 transition-transform group-hover:scale-105">
            {initials}
          </div>

          {/* User Details */}
          <div className="hidden sm:flex flex-col text-left min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-bold text-neutral-900 tracking-tight truncate max-w-[120px] leading-none">
                {user.name}
              </p>
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#3cb976]"></span>
              </span>
            </div>
            <p className="text-[10px] font-medium text-neutral-500 capitalize leading-tight mt-0.5 truncate max-w-[130px]">
              {roleLabel}
            </p>
          </div>

          <ChevronDown
            className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-[#7e2562]' : ''
            }`}
          />
        </button>

        {/* Dropdown Menu */}
        <AnimatePresence>
          {isOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsOpen(false)}
              />

              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-72 bg-white rounded-sm shadow-plum-lg border border-[#7e2562]/20 overflow-hidden z-50 flex flex-col"
              >
                {/* User Summary Header */}
                <div className="p-3.5 border-b border-[#7e2562]/10 bg-gradient-to-b from-[#faedf5]/80 to-[#faf6f9]/50">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-sm bg-gradient-to-tr from-[#7e2562] to-[#9b3179] text-white flex items-center justify-center font-bold text-sm shadow-xs ring-2 ring-white shrink-0 mt-0.5">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-xs font-bold text-neutral-900 leading-tight">
                          {user.name}
                        </p>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-xs text-[9px] font-bold   tracking-wider bg-[#faedf5] text-[#7e2562] border border-[#7e2562]/20 shrink-0">
                          <Shield className="w-2.5 h-2.5 mr-0.5" />
                          {(user.role || user.primaryRole || '').replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500 font-mono truncate mt-0.5">
                        {user.email}
                      </p>
                      {user.branch && (
                        <p className="text-[10px] text-neutral-500 font-medium flex items-center gap-1 mt-1">
                          <Store className="w-2.5 h-2.5 text-neutral-400 shrink-0" />
                          <span className="truncate">{user.branch.name}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Dropdown Options */}
                <div className="p-1.5 space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      setIsSettingsOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-[#faedf5]/70 hover:text-[#7e2562] rounded-xs transition-colors text-left cursor-pointer group"
                  >
                    <div className="w-6 h-6 rounded-xs bg-neutral-100 group-hover:bg-[#faedf5] flex items-center justify-center text-neutral-500 group-hover:text-[#7e2562] transition-colors">
                      <Settings className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1">
                      <span className="block font-bold">Account Settings</span>
                      <span className="text-[10px] text-neutral-400 block font-normal">Edit email and password</span>
                    </div>
                  </button>
                </div>

                {/* Sign Out Action */}
                <div className="p-1.5 border-t border-[#7e2562]/10 bg-[#faf6f9]/50">
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-danger hover:bg-[#fef5f2] rounded-xs transition-colors text-left cursor-pointer group"
                  >
                    <div className="w-6 h-6 rounded-xs bg-danger/10 group-hover:bg-danger/20 flex items-center justify-center text-danger transition-colors">
                      <LogOut className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                    </div>
                    <span>Sign Out</span>
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Settings / Profile Modal */}
      <ProfileSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
}
