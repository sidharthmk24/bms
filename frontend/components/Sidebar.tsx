"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Store, 
  BookOpen, 
  Boxes, 
  ShoppingCart,
  TrendingUp,
  Settings,
  Shield,
  History,
  FileText,
  Truck,
  ArrowLeftRight,
  MessageSquare,
  Receipt,
  IndianRupee,
  BarChart2,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import Image from 'next/image';

import { getHighestPriorityRole } from '@/lib/api-backend/users/enums/user-role.enum';
import { Tent } from 'lucide-react';
import { api } from '@/lib/api';

import { useSearchParams } from 'next/navigation';
import { LogOut, Clock, Send } from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, exitExhibitionMode } = useAuth();
  const [activeExhibition, setActiveExhibition] = useState<any | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Detect if user is inside an Exhibition Live Workspace (e.g. /dashboard/exhibitions/[id])
  const isExhibitionMode = pathname.startsWith('/dashboard/exhibitions/') && pathname !== '/dashboard/exhibitions';
  const currentExhibitionId = isExhibitionMode ? pathname.split('/dashboard/exhibitions/')[1] : null;
  const currentTab = searchParams ? searchParams.get('tab') || 'POS' : 'POS';

  useEffect(() => {
    if (!user) return;
    const fetchActiveExhibition = async () => {
      try {
        const res = await api.get('/exhibitions');
        if (res.success && Array.isArray(res.data)) {
          const now = new Date();
          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const day = String(now.getDate()).padStart(2, '0');
          const todayStr = `${year}-${month}-${day}`;

          // Find active exhibition where today is between startDate and endDate (inclusive of endDate)
          const active = res.data.find((e: any) => {
            if (['CLOSED', 'REJECTED', 'CANCELLED'].includes(e.status)) return false;

            const startStr = e.startDate ? String(e.startDate).split('T')[0] : '';
            const endStr = e.endDate ? String(e.endDate).split('T')[0] : '';

            // Tab stays visible from startDate through endDate (disappears the day after endDate)
            const isWithinDates = todayStr >= startStr && todayStr <= endStr;
            const isAssigned = 
              e.assignedUserId === user.id || 
              e.assignments?.some((a: any) => a.userId === user.id) ||
              ['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER'].includes(user.role || '');

            return isWithinDates && isAssigned;
          });
          if (active) setActiveExhibition(active);
          else setActiveExhibition(null);
        }
      } catch (err) {
        // Silent catch for background nav check
      }
    };
    fetchActiveExhibition();
  }, [user]);

  if (!user) return null;

  if (isExhibitionMode) {
    const rawId = pathname.split('/dashboard/exhibitions/')[1] || '';
    const currentExhibitionId = rawId.split('/')[0];

    const exhibitionNavLinks = [
      { name: 'Exhibition Dashboard', subRoute: 'overview', icon: LayoutDashboard },
      { name: 'Billing', subRoute: 'live-billing', icon: ShoppingCart },
      { name: 'Inventory', subRoute: 'stock', icon: Boxes },
      { name: 'Bills', subRoute: 'bills', icon: Receipt },
      { name: 'Restock', subRoute: 'topup', icon: Send },
      { name: 'Credit Copies', subRoute: 'credit', icon: FileText },
      { name: 'End of Day Close', subRoute: 'day-close', icon: Clock },
    ];

    return (
      <div className={`flex flex-col shrink-0 ${isCollapsed ? 'w-20' : 'w-72'} bg-white/95 border-r border-[#7e2562]/10 h-full overflow-y-auto backdrop-blur-2xl shadow-plum-sm transition-all duration-300 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']`}>
        {/* Header / Logo */}
        <div className={`flex items-center border-b border-[#7e2562]/10 shrink-0 ${isCollapsed ? 'h-20 justify-center px-4' : 'h-20 px-6 justify-between'}`}>
          <div className={`flex flex-col gap-1 ${isCollapsed ? 'hidden' : 'flex'}`}>
            <Image className='object-contain' src="/kairaliLogo.png" alt="Kairali Books" width={115} height={45} priority />
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold text-[#7e2562] pl-0.5 tracking-wide uppercase flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#7e2562] animate-pulse"></span> Exhibition Mode
              </span>
          
            </div>
          </div>
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)} 
            className="p-2 text-muted-foreground hover:text-foreground rounded-sm hover:bg-[#faedf5] transition-colors shrink-0 cursor-pointer"
          >
            {isCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>
        </div>

        {/* Navigation */}
        <div className="p-3 flex-1 flex flex-col justify-between gap-4">
          <nav className="space-y-1.5 flex-1">
            {!isCollapsed && <div className="px-3 text-[11px] font-bold text-[#7e2562]/70 tracking-wider mb-2 uppercase">Venue Operations</div>}
            {exhibitionNavLinks.map((link) => {
              const Icon = link.icon;
              const linkHref = `/dashboard/exhibitions/${currentExhibitionId}/${link.subRoute}`;
              const isActive = pathname.endsWith(`/${link.subRoute}`) || (link.subRoute === 'overview' && pathname.endsWith(`/${currentExhibitionId}`));
              return (
                <Link
                  key={link.name}
                  href={linkHref}
                  className={`apple-button group flex items-center justify-between rounded-sm px-3.5 py-2.5 text-[14px] font-medium transition-all duration-150 relative overflow-hidden ${
                    isActive 
                      ? 'bg-[#7e2562] text-white shadow-plum-sm font-semibold' 
                      : 'text-foreground/80 hover:bg-[#7e2562]/8 hover:text-primary'
                  } ${isCollapsed ? 'justify-center px-0' : ''}`}
                >
                  <span className="flex items-center gap-3 relative z-10">
                    <Icon className={`h-4.5 w-4.5 shrink-0 ${isActive ? 'text-white' : 'text-[#7e2562]'}`} />
                    {!isCollapsed && <span className="truncate">{link.name}</span>}
                  </span>
                  {isActive && !isCollapsed && (
                    <span className="relative z-10 h-1.5 w-1.5 rounded-full bg-white opacity-80" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Exit Exhibition Mode */}
          <div className="pt-3 border-t border-[#7e2562]/10">
            <button
              onClick={() => {
                exitExhibitionMode();
                router.push('/dashboard/exhibitions');
              }}
              className="w-full flex items-center gap-2.5 rounded-sm px-3.5 py-2.5 text-xs font-bold text-[#7e2562] bg-[#faedf5] hover:bg-[#f6dbe9] border border-[#7e2562]/20 transition shadow-xs cursor-pointer"
            >
              <LogOut className="h-4 w-4 shrink-0 text-[#7e2562]" />
              {!isCollapsed && <span>Exit Exhibition Mode</span>}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const getDashboardLink = () => {
    const isImpersonating = !!user.originalRoles;
    const role = isImpersonating
      ? (user.role || user.primaryRole || '')
      : getHighestPriorityRole(user.roles && user.roles.length > 0 ? user.roles : [user.role || user.primaryRole || '']);
    
    // If assigned to a branch but have an admin role, show the branch manager dashboard
    if (user.branchId && ['SUPER_ADMIN', 'ADMIN'].includes(role)) {
      return '/dashboard/branch-manager';
    }

    switch (role) {
      case 'SUPER_ADMIN': return '/dashboard/super-admin';
      case 'ADMIN': return '/dashboard/admin';
      case 'CENTRAL_INVENTORY_MANAGER': return '/dashboard/central-inventory';
      case 'FINANCE': return '/dashboard/finance';
      case 'BRANCH_MANAGER': return '/dashboard/branch-manager';
      case 'BRANCH_INVENTORY': return '/dashboard/branch-inventory';
      case 'BRANCH_FRONT_OFFICE': return '/dashboard/branch-front-office';
      default: return '/dashboard';
    }
  };

  // Base links available to many roles
  const links = [
    { name: 'Dashboard', href: getDashboardLink(), icon: LayoutDashboard, roles: ['*'] },
    { name: 'Billing', href: '/dashboard/billing', icon: ShoppingCart, roles: ['BRANCH_FRONT_OFFICE', 'BRANCH_MANAGER'] },
    { name: 'All Bills', href: '/dashboard/bills', icon: IndianRupee, roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE', 'BRANCH_MANAGER', 'BRANCH_FRONT_OFFICE'] },
    // { name: 'EOD Sales', href: '/dashboard/eod-sales', icon: BarChart2, roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE'] },
    { name: 'Inventory', href: '/dashboard/inventory', icon: Boxes, roles: ['BRANCH_INVENTORY', 'BRANCH_MANAGER', 'SUPER_ADMIN', 'ADMIN', 'BRANCH_FRONT_OFFICE', 'CENTRAL_INVENTORY_MANAGER'] },
    { name: 'Warehouse Stock', href: '/dashboard/central-stock', icon: Store, roles: ['CENTRAL_INVENTORY_MANAGER', 'SUPER_ADMIN', 'ADMIN'] },
    { name: 'Purchase Orders', href: '/dashboard/purchase-orders', icon: Truck, roles: ['CENTRAL_INVENTORY_MANAGER', 'SUPER_ADMIN', 'ADMIN'] },
    { name: 'Stock Transfers', href: '/dashboard/transfers', icon: ArrowLeftRight, roles: ['BRANCH_INVENTORY', 'BRANCH_MANAGER', 'CENTRAL_INVENTORY_MANAGER', 'SUPER_ADMIN', 'ADMIN'] },
    { name: 'Exhibitions', href: '/dashboard/exhibitions', icon: Store, roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE', 'CENTRAL_INVENTORY_MANAGER', 'BRANCH_MANAGER', 'BRANCH_INVENTORY', 'BRANCH_FRONT_OFFICE'] },
    { name: 'Credit Copies', href: '/dashboard/credit-copies', icon: FileText, roles: ['BRANCH_MANAGER', 'SUPER_ADMIN', 'ADMIN'] },
    // { name: 'Enquiries', href: '/dashboard/enquiries', icon: MessageSquare, roles: ['BRANCH_FRONT_OFFICE', 'BRANCH_MANAGER', 'CENTRAL_INVENTORY_MANAGER', 'SUPER_ADMIN', 'ADMIN'] },
    // { name: 'Catalog', href: '/dashboard/catalog', icon: BookOpen, roles: ['SUPER_ADMIN' , 'ADMIN', 'CENTRAL_INVENTORY_MANAGER'] },
    // { name: 'Finance', href: '/dashboard/finance', icon: FileText, roles: ['FINANCE', 'SUPER_ADMIN'] },
    { name: 'Users', href: '/dashboard/users', icon: Users, roles: ['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER'] },
    { name: 'Branches', href: '/dashboard/branches', icon: Store, roles: ['SUPER_ADMIN', 'ADMIN', 'CENTRAL_INVENTORY_MANAGER'] },
    { name: 'Audit Logs', href: '/dashboard/audit', icon: History, roles: ['SUPER_ADMIN'] },
    // { name: 'Settings', href: '/dashboard/settings', icon: Settings, roles: ['SUPER_ADMIN'] },
  ];

  const visibleLinks = links.filter(link => {
    if (link.roles.includes('*')) return true;
    
    // If impersonating, strictly limit to the impersonated role. 
    // Otherwise, show links for all of the user's assigned roles.
    const isImpersonating = !!user.originalRoles;
    const effectiveRoles = isImpersonating 
      ? [user.role || user.primaryRole || ''] 
      : (user.roles && user.roles.length > 0 ? user.roles : [user.role || user.primaryRole || '']);
      
    return link.roles.some(r => effectiveRoles.includes(r));
  });

  return (
    <div className={`flex flex-col shrink-0 ${isCollapsed ? 'w-20' : 'w-72'} bg-white/95 border-r border-[#7e2562]/10 h-full overflow-y-auto backdrop-blur-2xl shadow-plum-sm transition-all duration-300 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']`}>
      {/* Header / Logo */}
      <div className={`flex items-center border-b border-[#7e2562]/10 shrink-0 ${isCollapsed ? 'h-20 justify-center px-4' : 'h-20 px-6 justify-between'}`}>
        <div className={`flex flex-col gap-1 ${isCollapsed ? 'hidden' : 'flex'}`}>
          <Image className='object-contain' src="/kairaliLogo.png" alt="Kairali Books" width={115} height={45} priority />
          <span className="text-[11px] font-bold text-primary pl-0.5 tracking-wide">
            Bookstore Management System
          </span>
        </div>
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)} 
          className="p-2 text-muted-foreground hover:text-foreground rounded-sm hover:bg-[#faedf5] transition-colors shrink-0 cursor-pointer"
        >
          {isCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
        </button>
      </div>
      
      <div className="p-3 flex-1 flex flex-col gap-4">
        {/* Navigation */}
        <nav className="space-y-1.5 flex-1">
          {!isCollapsed && <div className="px-3 text-[11px] font-bold text-[#7e2562]/70   tracking-wider mb-2">Main Menu</div>}

          {/* Active Exhibition Live Operating Surface Banner Tab */}
          {activeExhibition && (
            <Link
              href={`/dashboard/exhibitions/${activeExhibition.id}/overview`}
              className="group flex items-center justify-between rounded-lg px-3.5 py-3 text-[13px] font-bold bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md hover:shadow-lg transition-all duration-200 relative overflow-hidden mb-3 animate-pulse border border-emerald-400"
            >
              <span className="flex items-center gap-2.5 relative z-10">
                <Tent className="h-5 w-5 text-emerald-200 shrink-0" />
                {!isCollapsed && (
                  <div className="flex flex-col min-w-0">
                    <span className="truncate text-xs font-black tracking-wide text-white">
                      LIVE: {activeExhibition.name || activeExhibition.eventName}
                    </span>
                    <span className="text-[10px] text-emerald-100 font-normal">Active Venue Workspace</span>
                  </div>
                )}
              </span>
              {!isCollapsed && (
                <span className="relative z-10 text-[9px] font-extrabold bg-white/20 text-white px-2 py-0.5 rounded-full uppercase">
                  OPEN
                </span>
              )}
            </Link>
          )}
          {visibleLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.name}
                href={link.href}
                title={isCollapsed ? link.name : undefined}
                className={`apple-button group flex items-center justify-between rounded-sm px-3.5 py-2.5 text-[14px] font-medium transition-all duration-150 relative overflow-hidden ${
                  isActive 
                    ? 'bg-primary text-white shadow-plum-sm font-semibold' 
                    : 'text-foreground/80 hover:bg-[#7e2562]/8 hover:text-primary'
                } ${isCollapsed ? 'justify-center px-0' : ''}`}
              >
                {/* Active link background effect */}
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-[#7e2562] to-[#9b3179] opacity-100" />
                )}
                
                <span className="flex items-center gap-3 relative z-10">
                  <Icon 
                    className={`flex-shrink-0 h-4.5 w-4.5 transition-transform duration-200 ${
                      isActive ? 'opacity-100 text-white' : 'opacity-70 group-hover:opacity-100 group-hover:text-primary'
                    }`} 
                  />
                  {!isCollapsed && <span className="truncate tracking-tight">{link.name}</span>}
                </span>

                {isActive && !isCollapsed && (
                  <span className="relative z-10 h-1.5 w-1.5 rounded-full bg-white opacity-80" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

  \
    </div>
  );
}
