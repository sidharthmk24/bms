"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
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
  Loader2,
  ChevronRight,
  Inbox,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  link?: string;
}

interface NotificationDestination {
  url: string;
  label: string;
}

export default function NotificationDropdown() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [animateBell, setAnimateBell] = useState(false);
  const [prevUnreadCount, setPrevUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'unread' | 'read'>('unread');
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const router = useRouter();
  const { user } = useAuth();

  const unreadNotifications = notifications.filter(n => !n.isRead);
  const readNotifications = notifications.filter(n => n.isRead);
  const unreadCount = unreadNotifications.length;
  const readCount = readNotifications.length;

  const currentNotifications = activeTab === 'unread' ? unreadNotifications : readNotifications;

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

  const markAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
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

  const getNotificationDestination = (n: NotificationItem): NotificationDestination => {
    if (n.link) {
      return { url: n.link, label: 'Details' };
    }

    const type = (n.type || '').toUpperCase();
    const title = (n.title || '').toLowerCase();
    const message = (n.message || '').toLowerCase();
    const role = user?.role || user?.primaryRole || '';

    // 1. Exhibitions
    if (type === 'EXHIBITION' || title.includes('exhibition') || message.includes('exhibition')) {
      return { url: '/dashboard/exhibitions', label: 'Exhibitions' };
    }

    // 2. Stock Transfers
    if (
      title.includes('transfer') || 
      message.includes('transfer') || 
      title.includes('stock transfer')
    ) {
      return { url: '/dashboard/transfers', label: 'Stock Transfers' };
    }

    // 3. Restock Requests
    if (
      type === 'RESTOCK_REQUEST' || 
      title.includes('restock') || 
      message.includes('restock')
    ) {
      return { url: '/dashboard/restock', label: 'Restock' };
    }

    // 4. Stock alerts (Sold Out / Low Stock)
    if (
      type === 'SOLD_OUT' || 
      type === 'LOW_STOCK' || 
      title.includes('sold out') || 
      title.includes('low stock') || 
      message.includes('sold out') || 
      message.includes('low in stock')
    ) {
      if (title.includes('central') || message.includes('central warehouse') || role === 'CENTRAL_INVENTORY_MANAGER') {
        return { url: '/dashboard/central-stock', label: 'Central Stock' };
      }
      return { url: '/dashboard/inventory', label: 'Inventory' };
    }

    // 5. Enquiries & New Title Requests
    if (
      type === 'ENQUIRY' || 
      title.includes('enquiry') || 
      message.includes('enquiry') || 
      title.includes('title request') || 
      message.includes('title request')
    ) {
      return { url: '/dashboard/enquiries', label: 'Enquiries' };
    }

    // 6. Finance & Expenses & Cash Reconciliation
    if (
      type === 'FINANCE' || 
      title.includes('expense') || 
      message.includes('expense') || 
      title.includes('reconciliation') || 
      message.includes('reconciliation') ||
      title.includes('variance') ||
      message.includes('variance')
    ) {
      return { url: '/dashboard/finance', label: 'Finance' };
    }

    // 7. Purchase orders / Procurement
    if (
      type === 'PURCHASE_ORDER' || 
      type === 'PROCUREMENT' || 
      title.includes('purchase order') || 
      message.includes('purchase order') ||
      title.includes('procurement') ||
      message.includes('procurement')
    ) {
      return { url: '/dashboard/purchase-orders', label: 'Purchase Orders' };
    }

    // 8. Credit copies
    if (
      type === 'CREDIT_COPY' || 
      type === 'CREDIT_COPIES' || 
      title.includes('credit cop') || 
      message.includes('credit cop')
    ) {
      return { url: '/dashboard/credit-copies', label: 'Credit Copies' };
    }

    // 9. Billing & Invoices & Sales
    if (
      type === 'BILL' || 
      type === 'BILLING' || 
      title.includes('bill') || 
      message.includes('bill') ||
      title.includes('sale') ||
      message.includes('eod')
    ) {
      if (role === 'BRANCH_FRONT_OFFICE') {
        return { url: '/dashboard/billing', label: 'Billing' };
      }
      return { url: '/dashboard/bills', label: 'Bills' };
    }

    // 10. Catalog
    if (
      type === 'CATALOG' || 
      title.includes('catalog') || 
      message.includes('catalog')
    ) {
      return { url: '/dashboard/catalog', label: 'Catalog' };
    }

    // 11. Users
    if (type === 'USER' || title.includes('user') || message.includes('user account')) {
      return { url: '/dashboard/users', label: 'Users' };
    }

    // 12. Branches
    if (type === 'BRANCH' || title.includes('branch') || message.includes('branch')) {
      return { url: '/dashboard/branches', label: 'Branches' };
    }

    // 13. Audit
    if (type === 'AUDIT' || title.includes('audit') || message.includes('audit')) {
      return { url: '/dashboard/audit', label: 'Audit' };
    }

    // Fallback to role-specific dashboard
    switch (role) {
      case 'SUPER_ADMIN': return { url: '/dashboard/super-admin', label: 'Dashboard' };
      case 'ADMIN': return { url: '/dashboard/admin', label: 'Dashboard' };
      case 'CENTRAL_INVENTORY_MANAGER': return { url: '/dashboard/central-inventory', label: 'Dashboard' };
      case 'FINANCE': return { url: '/dashboard/finance', label: 'Dashboard' };
      case 'BRANCH_MANAGER': return { url: '/dashboard/branch-manager', label: 'Dashboard' };
      case 'BRANCH_INVENTORY': return { url: '/dashboard/branch-inventory', label: 'Dashboard' };
      case 'BRANCH_FRONT_OFFICE': return { url: '/dashboard/branch-front-office', label: 'Dashboard' };
      default: return { url: '/dashboard', label: 'Dashboard' };
    }
  };

  const handleNotificationClick = async (n: NotificationItem) => {
    const dest = getNotificationDestination(n);

    // Optimistically mark as read
    if (!n.isRead) {
      setNotifications(prev => 
        prev.map(item => item.id === n.id ? { ...item, isRead: true } : item)
      );
      try {
        api.patch(`/notifications/${n.id}/read`);
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }

    setIsOpen(false);
    router.push(dest.url);
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
          icon: <AlertTriangle className="w-4 h-4 text-black" />,
          bg: 'bg-neutral-100 border-neutral-200'
        };
      case 'LOW_STOCK':
        return {
          icon: <AlertCircle className="w-4 h-4 text-black" />,
          bg: 'bg-neutral-100 border-neutral-200'
        };
      case 'RESTOCK_REQUEST':
        return {
          icon: <RefreshCw className="w-4 h-4 text-black" />,
          bg: 'bg-neutral-100 border-neutral-200'
        };
      case 'EXHIBITION':
        return {
          icon: <MapPin className="w-4 h-4 text-black" />,
          bg: 'bg-neutral-100 border-neutral-200'
        };
      case 'ENQUIRY':
        return {
          icon: <HelpCircle className="w-4 h-4 text-black" />,
          bg: 'bg-neutral-100 border-neutral-200'
        };
      case 'FINANCE':
        return {
          icon: <DollarSign className="w-4 h-4 text-black" />,
          bg: 'bg-neutral-100 border-neutral-200'
        };
      default:
        return {
          icon: <Info className="w-4 h-4 text-black" />,
          bg: 'bg-neutral-100 border-neutral-200'
        };
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-black hover:text-black hover:bg-neutral-100 rounded-lg transition-colors duration-200 focus:outline-none"
      >
        <motion.div
          animate={animateBell ? {
            rotate: [0, -15, 15, -15, 15, -10, 10, -5, 5, 0],
            scale: [1, 1.1, 1.1, 1.1, 1.1, 1, 1, 1, 1, 1]
          } : {}}
          transition={{ duration: 0.8 }}
        >
          <Bell className="w-6 h-6 text-black" />
        </motion.div>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-black text-[10px] font-bold text-white ring-2 ring-white animate-pulse">
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
            className="absolute right-0 mt-3 w-96 bg-white rounded-2xl shadow-xl border border-neutral-200 overflow-hidden z-50 flex flex-col max-h-[34rem]"
          >
            {/* Header */}
            <div className="px-5 pt-4 pb-3 border-b border-neutral-200 bg-neutral-50/80">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-base font-bold text-black">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 text-xs font-semibold text-black bg-neutral-100 border border-neutral-200 rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs font-semibold text-black hover:text-neutral-600 underline underline-offset-2 transition-colors"
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              {/* Tabs: Unread vs Read */}
              <div className="grid grid-cols-2 p-1 bg-neutral-100 border border-neutral-200 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setActiveTab('unread')}
                  className={`py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all duration-200 ${
                    activeTab === 'unread'
                      ? 'bg-black text-white shadow-sm'
                      : 'text-neutral-600 hover:text-black'
                  }`}
                >
                  <span>Unread</span>
                  {unreadCount > 0 && (
                    <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ${
                      activeTab === 'unread'
                        ? 'bg-white text-black'
                        : 'bg-black text-white'
                    }`}>
                      {unreadCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('read')}
                  className={`py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all duration-200 ${
                    activeTab === 'read'
                      ? 'bg-black text-white shadow-sm'
                      : 'text-neutral-600 hover:text-black'
                  }`}
                >
                  <span>Read</span>
                  {readCount > 0 && (
                    <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-medium ${
                      activeTab === 'read'
                        ? 'bg-white/20 text-white'
                        : 'bg-neutral-200 text-black'
                    }`}>
                      {readCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-neutral-100 max-h-96">
              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3 text-neutral-400">
                  <Loader2 className="w-7 h-7 animate-spin text-black" />
                  <span className="text-xs text-neutral-500">Loading notifications...</span>
                </div>
              ) : currentNotifications.length === 0 ? (
                <div className="py-16 px-6 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="p-3 bg-neutral-100 border border-neutral-200 rounded-full">
                    {activeTab === 'unread' ? (
                      <CheckCircle2 className="w-6 h-6 text-black" />
                    ) : (
                      <Inbox className="w-6 h-6 text-black" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-black">
                      {activeTab === 'unread' ? "All caught up!" : "No read notifications"}
                    </h4>
                    <p className="text-xs text-neutral-500 mt-1 max-w-[16rem]">
                      {activeTab === 'unread' 
                        ? "You don't have any unread notifications right now."
                        : "Notifications you've already read will appear here."}
                    </p>
                  </div>
                  {activeTab === 'unread' && readCount > 0 && (
                    <button
                      onClick={() => setActiveTab('read')}
                      className="text-xs font-semibold text-black hover:underline mt-1"
                    >
                      View {readCount} past notification{readCount > 1 ? 's' : ''} →
                    </button>
                  )}
                </div>
              ) : (
                currentNotifications.map((n) => {
                  const style = getNotificationStyles(n.type);
                  const dest = getNotificationDestination(n);
                  return (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`px-5 py-4 flex items-start space-x-3 transition-all duration-150 cursor-pointer group select-none ${
                        n.isRead 
                          ? 'hover:bg-neutral-100/70 bg-white' 
                          : 'bg-neutral-50/70 hover:bg-neutral-100/90'
                      }`}
                      title={`Go to ${dest.label}`}
                    >
                      {/* Icon */}
                      <div className={`p-2 rounded-xl border shrink-0 ${style.bg} group-hover:scale-105 transition-transform duration-200`}>
                        {style.icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-start justify-between space-x-2">
                          <p className="text-sm leading-tight truncate text-black font-semibold">
                            {n.title}
                          </p>
                          <span className="text-[10px] text-neutral-400 shrink-0 mt-0.5">
                            {timeAgo(n.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-600 leading-normal break-words line-clamp-2">
                          {n.message}
                        </p>
                        <div className="flex items-center justify-between pt-1">
                          <span className="inline-flex items-center text-[10px] font-semibold text-black bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded-md group-hover:bg-neutral-200 transition-colors">
                            {dest.label}
                          </span>
                          <span className="text-[10px] font-medium text-neutral-500 group-hover:text-black flex items-center gap-0.5 transition-colors">
                            <span>Open</span>
                            <ChevronRight className="w-3 h-3 text-neutral-500 group-hover:text-black transition-transform group-hover:translate-x-0.5" />
                          </span>
                        </div>
                      </div>

                      {/* Read status indicator/action for unread items */}
                      {!n.isRead && (
                        <button
                          onClick={(e) => markAsRead(n.id, e)}
                          title="Mark as read without opening"
                          className="p-1.5 text-neutral-400 hover:text-black hover:bg-neutral-200 rounded-lg transition-all shrink-0 mt-0.5 border border-transparent hover:border-neutral-300"
                        >
                          <Check className="w-3.5 h-3.5" />
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
