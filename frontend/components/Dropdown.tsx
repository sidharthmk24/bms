"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';

export interface DropdownOption {
  label: string;
  value: string;
}

interface DropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  className?: string; // Container classes
  selectClassName?: string; // Trigger button classes
  disabled?: boolean;
  required?: boolean;
  isMulti?: boolean;
}

export function Dropdown({
  value,
  onChange,
  options,
  placeholder = 'Select an option...',
  className = '',
  selectClassName = '',
  disabled = false,
  required = false,
  isMulti = false,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
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

  const selectedOptions = isMulti
    ? options.filter((opt) => (value as unknown as string[])?.includes(opt.value))
    : options.filter((opt) => String(opt.value) === String(value));
  
  const selectedOption = selectedOptions[0];

  const handleToggle = () => {
    if (!isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      // If there is less than 200px space below, and more space above, open upwards
      if (spaceBelow < 250 && rect.top > spaceBelow) {
        setDropdownPosition('top');
      } else {
        setDropdownPosition('bottom');
      }
    }
    setIsOpen((prev) => !prev);
  };

  const handleSelect = (newValue: string) => {
    if (isMulti) {
      const currentValues = Array.isArray(value) ? value : [];
      let newValues;
      if (currentValues.includes(newValue)) {
        // Prevent removing the last role in a multi-select context
        if (currentValues.length <= 1) {
          alert('A user must have at least one role.');
          return;
        }
        newValues = currentValues.filter(v => v !== newValue);
      } else {
        newValues = [...currentValues, newValue];
      }
      onChange(newValues as any);
      // don't close on multi select
    } else {
      onChange(newValue);
      setIsOpen(false);
      if (selectRef.current) {
        selectRef.current.value = newValue;
        selectRef.current.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Visually hidden native select for HTML5 validation (required) */}
      <select
        ref={selectRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
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
        className={`w-full flex items-center justify-between px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
          disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'text-gray-900 cursor-pointer hover:bg-gray-50'
        } ${selectClassName}`}
      >
        <span className={`block truncate ${selectedOptions.length === 0 ? 'text-gray-500' : ''}`}>
          {selectedOptions.length > 0 
            ? selectedOptions.map(o => o.label).join(', ') 
            : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 ml-2 text-gray-400 transition-transform duration-200 ${isOpen ? (dropdownPosition === 'top' ? 'rotate-0' : 'rotate-180') : ''}`}
        />
      </button>

      {/* Custom UI Menu */}
      <AnimatePresence>
        {isOpen && !disabled && (
          <motion.div
            initial={{ opacity: 0, y: dropdownPosition === 'top' ? 10 : -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: dropdownPosition === 'top' ? 10 : -10 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-auto focus:outline-none ${
              dropdownPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
            }`}
          >
            <ul className="py-1">
              {options.length === 0 ? (
                <li className="px-3 py-2 text-sm text-gray-500 text-center">No options available</li>
              ) : (
                options.map((opt) => {
                  const isSelected = isMulti 
                    ? (value as unknown as string[])?.includes(opt.value)
                    : String(opt.value) === String(value);
                  return (
                    <li
                      key={opt.value}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(opt.value);
                      }}
                      className={`flex items-center justify-between px-3 py-2 text-sm cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <span className="block truncate">{opt.label}</span>
                      {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                    </li>
                  );
                })
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
