"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Plus } from 'lucide-react';
import { matchKeywords } from '@/lib/searchUtils';

export interface DropdownOption {
  label: string;
  value: string;
  sublabel?: string;
  isbn?: string;
  barcode?: string;
  badge?: string;
  badgeClassName?: string;
  icon?: React.ReactNode;
  isSelected?: boolean;
}

interface DropdownProps {
  value: any;
  onChange: (value: any) => void;
  options: DropdownOption[];
  placeholder?: string;
  className?: string; // Container classes
  selectClassName?: string; // Trigger button classes
  menuClassName?: string; // Dropdown menu panel classes
  disabled?: boolean;
  required?: boolean;
  isMulti?: boolean;
  searchable?: boolean;
  closeOnSelect?: boolean;
  actionType?: 'check' | 'plus';
  onItemToggle?: (option: DropdownOption, willSelect: boolean) => void;
  onItemSelect?: (option: DropdownOption) => void;
}

export function Dropdown({
  value,
  onChange,
  options,
  placeholder = 'Select an option...',
  className = '',
  selectClassName = '',
  menuClassName = '',
  disabled = false,
  required = false,
  isMulti = false,
  searchable = false,
  closeOnSelect,
  actionType = 'check',
  onItemToggle,
  onItemSelect,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom');
  const containerRef = useRef<HTMLDivElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery(''); // Reset search query when dropdown closes
    }
  }, [isOpen]);

  const selectedOptions = isMulti
    ? options.filter((opt) => (value as unknown as string[])?.includes(opt.value))
    : options.filter((opt) => String(opt.value) === String(value));
  
  const handleToggle = () => {
    if (!isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      // If there is less than 320px space below, and more space above, open upwards
      if (spaceBelow < 320 && rect.top > spaceBelow) {
        setDropdownPosition('top');
      } else {
        setDropdownPosition('bottom');
      }
    }
    setIsOpen((prev) => !prev);
  };

  const handleSelect = (newValue: string) => {
    const targetOpt = options.find((o) => o.value === newValue);
    const shouldClose = closeOnSelect !== undefined ? closeOnSelect : !isMulti;

    if (isMulti) {
      const currentValues = Array.isArray(value) ? (value as string[]) : [];
      let newValues: string[];
      const isCurrentlySelected = currentValues.includes(newValue);
      
      if (isCurrentlySelected) {
        newValues = currentValues.filter((v) => v !== newValue);
        if (onItemToggle && targetOpt) onItemToggle(targetOpt, false);
      } else {
        newValues = [...currentValues, newValue];
        if (onItemToggle && targetOpt) onItemToggle(targetOpt, true);
      }
      
      onChange(newValues);
      if (onItemSelect && targetOpt) onItemSelect(targetOpt);
      if (shouldClose) {
        setIsOpen(false);
      }
    } else {
      onChange(newValue);
      if (onItemSelect && targetOpt) onItemSelect(targetOpt);
      if (shouldClose) {
        setIsOpen(false);
      }
      if (selectRef.current) {
        selectRef.current.value = newValue;
        selectRef.current.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  };

  const isSelected = isMulti
    ? Array.isArray(value) && value.length > 0
    : value !== undefined &&
      value !== null &&
      String(value) !== '' &&
      String(value) !== 'all' &&
      String(value) !== 'ALL';

  return (
    <div className={`relative ${isOpen ? 'z-50' : 'z-auto'} ${className}`} ref={containerRef}>
      {/* Visually hidden native select for HTML5 validation (required) */}
      <select
        ref={selectRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        multiple={isMulti}
        className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
        aria-hidden="true"
        tabIndex={-1}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Custom UI Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={`w-full flex items-center justify-between px-3 py-2 border rounded-sm text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#7e2562]/30 focus:border-[#7e2562] ${
          disabled
            ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed border-black/10'
            : isSelected
            ? 'border-[#7e2562] ring-2 ring-[#7e2562]/30 shadow-plum-sm bg-[#faedf5]/40 text-neutral-900 font-bold hover:bg-[#faedf5]/60'
            : 'bg-white border-[#7e2562]/20 text-neutral-900 cursor-pointer hover:bg-[#faf6f9] hover:border-[#7e2562]/40'
        } ${selectClassName}`}
      >
        <div className="flex items-center min-w-0 mr-1 overflow-hidden">
          {!isMulti && selectedOptions.length === 1 && selectedOptions[0].icon && (
            <span className="shrink-0 mr-2 flex items-center">{selectedOptions[0].icon}</span>
          )}
          <span className={`block truncate ${selectedOptions.length === 0 ? 'text-neutral-400 font-normal' : isSelected ? 'text-neutral-900 font-bold' : 'text-neutral-900 font-medium'}`}>
            {isMulti
              ? selectedOptions.length > 0
                ? `${selectedOptions.length} title${selectedOptions.length > 1 ? 's' : ''} selected`
                : placeholder
              : selectedOptions.length > 0
              ? selectedOptions.map((o) => o.label).join(', ')
              : placeholder}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 ml-2 shrink-0 transition-transform duration-200 ${
            isSelected ? 'text-[#7e2562]' : 'text-neutral-400'
          } ${isOpen ? (dropdownPosition === 'top' ? 'rotate-0' : 'rotate-180') : ''}`}
        />
      </button>

      {/* Custom UI Menu */}
      <AnimatePresence>
        {isOpen && !disabled && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: dropdownPosition === 'top' ? 8 : -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: dropdownPosition === 'top' ? 8 : -8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className={`absolute z-[100] w-full bg-white border border-[#7e2562]/20 rounded-sm shadow-xl max-h-96 md:max-h-[380px] overflow-auto focus:outline-none ${
              dropdownPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
            } ${menuClassName}`}
          >
            {searchable && (
              <div className="p-2 border-b border-[#7e2562]/10 sticky top-0 bg-white z-10">
                <input
                  type="text"
                  autoFocus
                  placeholder="Search title or ISBN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full px-3 py-1.5 text-xs border border-[#7e2562]/20 rounded-sm focus:outline-none focus:ring-1 focus:ring-[#7e2562] focus:border-[#7e2562] text-neutral-900 bg-white"
                />
              </div>
            )}
            <ul className="py-1 divide-y divide-gray-100">
              {(() => {
                const displayOptions = searchable && searchQuery.trim() !== ''
                  ? options.filter((opt) =>
                      matchKeywords(
                        searchQuery,
                        opt.label,
                        opt.sublabel,
                        opt.isbn,
                        opt.badge
                      )
                    )
                  : options;

                if (displayOptions.length === 0) {
                  return <li className="px-3 py-4 text-xs text-neutral-400 text-center">No matching books found</li>;
                }

                return displayOptions.map((opt) => {
                  const isItemActive = opt.isSelected !== undefined
                    ? opt.isSelected
                    : isMulti
                    ? (value as unknown as string[])?.includes(opt.value)
                    : String(opt.value) === String(value);

                  return (
                    <li
                      key={opt.value}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(opt.value);
                      }}
                      className={`flex items-center justify-between px-3 py-2 text-xs cursor-pointer transition-colors ${
                        isItemActive ? 'bg-[#faedf5]/70 text-[#7e2562]' : 'text-neutral-800 hover:bg-[#faf6f9] hover:text-[#7e2562]'
                      }`}
                    >
                      <div className="flex items-start flex-1 min-w-0 mr-3">
                        {opt.icon && (
                          <span className="shrink-0 mr-2 mt-0.5 flex items-center">{opt.icon}</span>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`block truncate ${isItemActive ? 'font-bold text-[#7e2562]' : 'font-semibold text-gray-900'}`}>
                              {opt.label}
                            </span>
                            {opt.badge && (
                              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full shrink-0 ${opt.badgeClassName || 'bg-[#faedf5] text-[#7e2562] border border-[#7e2562]/20'}`}>
                                {opt.badge}
                              </span>
                            )}
                          </div>
                          {opt.sublabel ? (
                            <span className="block text-[11px] text-gray-600 font-medium truncate mt-0.5">
                              {opt.sublabel}
                            </span>
                          ) : opt.isbn ? (
                            <span className="block text-[10px] text-neutral-400 font-mono truncate mt-0.5">
                              ISBN: {opt.isbn}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {actionType === 'plus' ? (
                        isItemActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-sm text-[11px] font-bold bg-[#f0fbf5] text-[#3cb976] border border-[#3cb976]/30 shrink-0">
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" /> Added
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-sm text-[11px] font-bold bg-[#faedf5] text-[#7e2562] border border-[#7e2562]/30 hover:bg-[#7e2562] hover:text-white transition-colors shrink-0 shadow-2xs">
                            <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Add
                          </span>
                        )
                      ) : (
                        isItemActive && <Check className="w-4 h-4 text-[#7e2562] flex-shrink-0 ml-2" />
                      )}
                    </li>
                  );
                });
              })()}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
