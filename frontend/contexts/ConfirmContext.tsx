"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, HelpCircle, CheckCircle, Trash2 } from "lucide-react";

export interface ConfirmOptions {
  title?: string;
  message?: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "primary" | "warning" | "success";
  icon?: React.ComponentType<{ className?: string }>;
}

interface ConfirmContextType {
  confirm: (options?: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  const confirm = useCallback((options: ConfirmOptions = {}): Promise<boolean> => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        options,
        resolve,
      });
    });
  }, []);

  const handleClose = (result: boolean) => {
    if (modalState) {
      modalState.resolve(result);
      setModalState(null);
    }
  };

  const options = modalState?.options || {};
  const variant = options.variant || (options.confirmText?.toLowerCase().includes("delete") || options.confirmText?.toLowerCase().includes("remove") ? "danger" : "primary");

  const getVariantStyles = () => {
    switch (variant) {
      case "danger":
        return {
          iconBg: "bg-[#fef5f2] text-[#e45e34] border border-[#e45e34]/20",
          confirmBtn: "bg-[#e45e34] hover:bg-[#d0451b] text-white shadow-xs focus:ring-[#e45e34]",
          defaultIcon: Trash2,
          defaultTitle: "Are you sure you want to delete this?",
          defaultConfirmText: "Yes, Delete",
        };
      case "warning":
        return {
          iconBg: "bg-amber-50 text-amber-700 border border-amber-200",
          confirmBtn: "bg-amber-600 hover:bg-amber-700 text-white shadow-xs focus:ring-amber-600",
          defaultIcon: AlertTriangle,
          defaultTitle: "Confirmation Required",
          defaultConfirmText: "Yes, Continue",
        };
      case "success":
        return {
          iconBg: "bg-[#f0fbf5] text-[#3cb976] border border-[#3cb976]/30",
          confirmBtn: "bg-[#3cb976] hover:bg-[#29985e] text-white shadow-xs focus:ring-[#3cb976]",
          defaultIcon: CheckCircle,
          defaultTitle: "Confirm Action",
          defaultConfirmText: "Yes, Proceed",
        };
      case "primary":
      default:
        return {
          iconBg: "bg-[#faedf5] text-[#7e2562] border border-[#7e2562]/20",
          confirmBtn: "bg-[#7e2562] hover:bg-[#681b50] text-white shadow-plum-sm focus:ring-[#7e2562]",
          defaultIcon: HelpCircle,
          defaultTitle: "Are you sure?",
          defaultConfirmText: "Yes, Proceed",
        };
    }
  };

  const currentStyles = getVariantStyles();
  const IconComponent = options.icon || currentStyles.defaultIcon;

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      <AnimatePresence>
        {modalState?.isOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.15 }}
              className="bg-white rounded-sm shadow-2xl border border-[#7e2562]/15 w-full max-w-md overflow-hidden relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top hairline brand gradient */}
              <div className="h-1 bg-gradient-to-r from-[#50133c] via-[#7e2562] to-[#9b3179]" />

              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-sm shrink-0 ${currentStyles.iconBg}`}>
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-gray-900 tracking-tight">
                      {options.title || currentStyles.defaultTitle}
                    </h3>
                    <div className="mt-2 text-sm text-gray-600 leading-relaxed">
                      {options.message || "Please confirm if you want to proceed with this action. This cannot be undone."}
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => handleClose(false)}
                    className="apple-button px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-700 bg-white border border-gray-300 rounded-sm hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    {options.cancelText || "No, Cancel"}
                  </button>
                  <button
                    type="button"
                    autoFocus
                    onClick={() => handleClose(true)}
                    className={`apple-button px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-sm transition-all cursor-pointer ${currentStyles.confirmBtn}`}
                  >
                    {options.confirmText || currentStyles.defaultConfirmText}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return context.confirm;
}
