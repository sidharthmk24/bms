"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
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
  FileText,
  Truck,
  ArrowLeftRight,
  MessageSquare,
  LogOut,
  Receipt,
  BarChart2,
  Menu
} from 'lucide-react';
import Image from 'next/image';

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  if (!user) return null;

  const getDashboardLink = () => {
    const role = user.role || user.primaryRole || '';
    
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
    { name: 'All Bills', href: '/dashboard/bills', icon: Receipt, roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE', 'BRANCH_MANAGER', 'BRANCH_FRONT_OFFICE'] },
    { name: 'EOD Sales', href: '/dashboard/eod-sales', icon: BarChart2, roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE'] },
    { name: 'Inventory', href: '/dashboard/inventory', icon: Boxes, roles: ['BRANCH_INVENTORY', 'BRANCH_MANAGER', 'SUPER_ADMIN', 'ADMIN', 'BRANCH_FRONT_OFFICE'] },
    { name: 'Warehouse Stock', href: '/dashboard/central-stock', icon: Store, roles: ['CENTRAL_INVENTORY_MANAGER', 'SUPER_ADMIN', 'ADMIN'] },
    { name: 'Purchase Orders', href: '/dashboard/purchase-orders', icon: Truck, roles: ['CENTRAL_INVENTORY_MANAGER', 'SUPER_ADMIN', 'ADMIN'] },
    { name: 'Restock Requests', href: '/dashboard/restock', icon: TrendingUp, roles: ['CENTRAL_INVENTORY_MANAGER', 'SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER', 'BRANCH_INVENTORY'] },
    { name: 'Stock Transfers', href: '/dashboard/transfers', icon: ArrowLeftRight, roles: ['BRANCH_INVENTORY', 'BRANCH_MANAGER', 'CENTRAL_INVENTORY_MANAGER', 'SUPER_ADMIN', 'ADMIN'] },
    { name: 'Exhibitions', href: '/dashboard/exhibitions', icon: Store, roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE', 'CENTRAL_INVENTORY_MANAGER', 'BRANCH_MANAGER', 'BRANCH_INVENTORY', 'BRANCH_FRONT_OFFICE'] },
    { name: 'Credit Copies', href: '/dashboard/credit-copies', icon: FileText, roles: ['BRANCH_MANAGER', 'SUPER_ADMIN', 'ADMIN'] },
    // { name: 'Enquiries', href: '/dashboard/enquiries', icon: MessageSquare, roles: ['BRANCH_FRONT_OFFICE', 'BRANCH_MANAGER', 'CENTRAL_INVENTORY_MANAGER', 'SUPER_ADMIN', 'ADMIN'] },
    // { name: 'Catalog', href: '/dashboard/catalog', icon: BookOpen, roles: ['SUPER_ADMIN' , 'ADMIN', 'CENTRAL_INVENTORY_MANAGER'] },
    // { name: 'Finance', href: '/dashboard/finance', icon: FileText, roles: ['FINANCE', 'SUPER_ADMIN'] },
    { name: 'Users', href: '/dashboard/users', icon: Users, roles: ['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER'] },
    { name: 'Branches', href: '/dashboard/branches', icon: Store, roles: ['SUPER_ADMIN', 'ADMIN'] },
    { name: 'Audit', href: '/dashboard/audit', icon: Shield, roles: ['SUPER_ADMIN'] },
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

  const [isCollapsed, setIsCollapsed] = useState(false);

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
          <Menu className="w-5 h-5" />
        </button>
      </div>
      
      <div className="p-3 flex-1 flex flex-col gap-4">
        {/* Navigation */}
        <nav className="space-y-1.5 flex-1">
          {!isCollapsed && <div className="px-3 text-[11px] font-bold text-[#7e2562]/70 uppercase tracking-wider mb-2">Main Menu</div>}
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

      {/* Sidebar Footer */}
      <div className="p-3 border-t border-[#7e2562]/10 bg-[#faf6f9]/40 mt-auto space-y-2">
        {!isCollapsed && (
          <div className="flex items-center justify-between px-2 text-[11px] text-muted-foreground">
            <span>BMS v1.0 · Connected</span>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#3cb976]" />
            </span>
          </div>
        )}
        <button
          onClick={logout}
          title={isCollapsed ? 'Sign Out' : undefined}
          className={`flex items-center py-2 px-3 text-[13px] font-bold text-danger rounded-sm hover:bg-[#fef5f2] border border-transparent hover:border-[#fbd5c9] transition-all duration-200 group cursor-pointer ${isCollapsed ? 'justify-center w-full px-0' : 'w-full'}`}
        >
          <div className={`bg-danger/10 p-1 rounded-sm group-hover:bg-danger/20 transition-colors ${isCollapsed ? 'mr-0' : 'mr-2.5'}`}>
            <LogOut className={`h-3.5 w-3.5 transition-transform duration-200 ${isCollapsed ? '' : 'group-hover:-translate-x-0.5'}`} />
          </div>
          {!isCollapsed && "Sign Out"}
        </button>
      </div>
    </div>
  );
}
