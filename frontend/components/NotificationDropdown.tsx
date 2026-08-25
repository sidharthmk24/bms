"use client";

import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';
import { 
  Bell, 
  Check, 
  AlertTriangle, 
  AlertCircle, 
  RefreshCw, 
  MapPin, 
  HelpCircle, 
  DollarSign, 
  Info,
  Sparkles,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationDropdown() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [animateBell, setAnimateBell] = useState(false);
  const [prevUnreadCount, setPrevUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const fetchNotifications = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const response = await api.get<NotificationItem[]>('/notifications');
      if (response.success && Array.isArray(response.data)) {
        setNotifications(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(true);

    const handleMutation = () => {
      fetchNotifications();
    };

    window.addEventListener('app:data-mutated', handleMutation);
    
    // Close dropdown on click outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('app:data-mutated', handleMutation);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Trigger bell ring animation when unread count increases
  useEffect(() => {
    if (unreadCount > prevUnreadCount) {
      setAnimateBell(true);
      const timer = setTimeout(() => setAnimateBell(false), 1000);
      return () => clearTimeout(timer);
    }
    setPrevUnreadCount(unreadCount);
  }, [unreadCount, prevUnreadCount]);

  const markAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await api.patch(`/notifications/${id}/read`);
      if (response.success) {
        setNotifications(prev => 
          prev.map(n => n.id === id ? { ...n, isRead: true } : n)
        );
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await api.patch('/notifications');
      if (response.success) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const timeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getNotificationStyles = (type: string) => {
    switch (type) {
      case 'SOLD_OUT':
        return {
          icon: <AlertTriangle className="w-4 h-4 text-rose-600" />,
          bg: 'bg-rose-50 border-rose-100',
          dot: 'bg-rose-500'
        };
      case 'LOW_STOCK':
        return {
          icon: <AlertCircle className="w-4 h-4 text-amber-600" />,
          bg: 'bg-amber-50 border-amber-100',
          dot: 'bg-amber-500'
        };
      case 'RESTOCK_REQUEST':
        return {
          icon: <RefreshCw className="w-4 h-4 text-sky-600" />,
          bg: 'bg-sky-50 border-sky-100',
          dot: 'bg-sky-500'
        };
      case 'EXHIBITION':
        return {
          icon: <MapPin className="w-4 h-4 text-purple-600" />,
          bg: 'bg-purple-50 border-purple-100',
          dot: 'bg-purple-500'
        };
      case 'ENQUIRY':
        return {
          icon: <HelpCircle className="w-4 h-4 text-indigo-600" />,
          bg: 'bg-indigo-50 border-indigo-100',
          dot: 'bg-indigo-500'
        };
      case 'FINANCE':
        return {
          icon: <DollarSign className="w-4 h-4 text-emerald-600" />,
          bg: 'bg-emerald-50 border-emerald-100',
          dot: 'bg-emerald-500'
        };
      default:
        return {
          icon: <Info className="w-4 h-4 text-slate-600" />,
          bg: 'bg-slate-50 border-slate-100',
          dot: 'bg-slate-500'
        };
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors duration-200 focus:outline-none"
      >
        <motion.div
          animate={animateBell ? {
            rotate: [0, -15, 15, -15, 15, -10, 10, -5, 5, 0],
            scale: [1, 1.1, 1.1, 1.1, 1.1, 1, 1, 1, 1, 1]
          } : {}}
          transition={{ duration: 0.8 }}
        >
          <Bell className="w-6 h-6" />
        </motion.div>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-white animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute right-0 mt-3 w-96 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/60 overflow-hidden z-50 flex flex-col max-h-[32rem]"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-200/60 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center space-x-2">
                <span className="text-base font-bold text-slate-800">Notifications</span>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-semibold text-rose-600 bg-rose-50 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Mark all as read
                </button>
              )}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-slate-100 max-h-96">
              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3 text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                  <span className="text-xs">Loading notifications...</span>
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-16 px-6 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="p-4 bg-slate-50 rounded-full">
                    <Sparkles className="w-8 h-8 text-slate-300" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700">All caught up!</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-[16rem]">
                      You don't have any notifications right now. Enjoy your clean inbox!
                    </p>
                  </div>
                </div>
              ) : (
                notifications.map((n) => {
                  const style = getNotificationStyles(n.type);
                  return (
                    <div
                      key={n.id}
                      className={`px-5 py-4 flex items-start space-x-3 transition-colors duration-150 ${
                        n.isRead ? 'hover:bg-slate-50/40 bg-white' : 'bg-blue-50/10 hover:bg-blue-50/20'
                      }`}
                    >
                      {/* Icon */}
                      <div className={`p-2 rounded-xl border shrink-0 ${style.bg}`}>
                        {style.icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-start justify-between space-x-2">
                          <p className={`text-sm leading-tight truncate ${n.isRead ? 'font-medium text-slate-700' : 'font-bold text-slate-900'}`}>
                            {n.title}
                          </p>
                          <span className="text-[10px] text-slate-400 shrink-0 mt-0.5">
                            {timeAgo(n.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 leading-normal break-words">
                          {n.message}
                        </p>
                      </div>

                      {/* Read status indicator/action */}
                      {!n.isRead && (
                        <button
                          onClick={(e) => markAsRead(n.id, e)}
                          title="Mark as read"
                          className="p-1 text-slate-300 hover:text-slate-500 hover:bg-slate-100 rounded transition-all shrink-0 mt-1"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
