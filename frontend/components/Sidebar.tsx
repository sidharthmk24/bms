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
    { name: 'Central Stock', href: '/dashboard/central-stock', icon: Store, roles: ['CENTRAL_INVENTORY_MANAGER', 'SUPER_ADMIN', 'ADMIN'] },
    { name: 'Purchase Orders', href: '/dashboard/purchase-orders', icon: Truck, roles: ['CENTRAL_INVENTORY_MANAGER', 'SUPER_ADMIN', 'ADMIN'] },
    { name: 'Restock', href: '/dashboard/restock', icon: TrendingUp, roles: ['BRANCH_INVENTORY', 'BRANCH_MANAGER', 'CENTRAL_INVENTORY_MANAGER'] },
    { name: 'Stock Transfers', href: '/dashboard/transfers', icon: ArrowLeftRight, roles: ['BRANCH_INVENTORY', 'BRANCH_MANAGER', 'CENTRAL_INVENTORY_MANAGER', 'SUPER_ADMIN', 'ADMIN'] },
    { name: 'Exhibitions', href: '/dashboard/exhibitions', icon: Store, roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE', 'CENTRAL_INVENTORY_MANAGER', 'BRANCH_MANAGER', 'BRANCH_INVENTORY', 'BRANCH_FRONT_OFFICE'] },
    { name: 'Credit Copies', href: '/dashboard/credit-copies', icon: FileText, roles: ['BRANCH_MANAGER', 'SUPER_ADMIN', 'ADMIN'] },
    // { name: 'Enquiries', href: '/dashboard/enquiries', icon: MessageSquare, roles: ['BRANCH_FRONT_OFFICE', 'BRANCH_MANAGER', 'CENTRAL_INVENTORY_MANAGER', 'SUPER_ADMIN', 'ADMIN'] },
    { name: 'Catalog', href: '/dashboard/catalog', icon: BookOpen, roles: ['SUPER_ADMIN' , 'ADMIN', 'CENTRAL_INVENTORY_MANAGER'] },
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
    <div className={`flex flex-col shrink-0 ${isCollapsed ? 'w-20' : 'w-72'} bg-white border-r border-slate-200/60 h-full overflow-y-auto backdrop-blur-xl shadow-[4px_0_24px_rgba(0,0,0,0.02)] transition-all duration-300 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']`}>
      {/* Header / Logo */}
      <div className={`flex items-center border-b border-slate-200/50 shrink-0 ${isCollapsed ? 'h-24 justify-center px-3' : 'h-24 px-6 justify-between'}`}>
        {!isCollapsed ? (
          <div className="flex items-center">
            <Image
              className="object-contain h-12 w-auto"
              src="/kb.png"
              alt="Kairali Books"
              width={160}
              height={48}
              priority
            />
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <Image
              className="object-contain h-10 w-10"
              src="/kb.png"
              alt="Kairali Books"
              width={40}
              height={40}
              priority
            />
          </div>
        )}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)} 
          className="p-2 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      
      <div className="p-4 flex-1 flex flex-col gap-6">
        {/* User Card */}
        <div className={`bg-slate-50/80 rounded-2xl border border-slate-200/60 shadow-xs flex relative overflow-hidden group hover:border-slate-300 transition-all duration-300 ${isCollapsed ? 'justify-center items-center p-2' : 'px-4 py-3.5 flex-col gap-1'}`}>
          <div className="absolute inset-0 bg-gradient-to-r from-slate-100/50 to-slate-200/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          {isCollapsed ? (
             <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold relative z-10 text-sm">
               {user.name.charAt(0)}
             </div>
          ) : (
            <div className="relative">
              <p className="text-sm font-bold text-slate-800 tracking-tight">{user.name}</p>
              <p className="text-xs font-medium text-slate-500 flex items-center gap-2 mt-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="capitalize">
                  {(user.role || user.primaryRole || '').replace(/_/g, ' ').toLowerCase()}
                  {user.branch?.name ? ` • ${user.branch.name}` : ''}
                </span>
              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="space-y-1.5 flex-1">
          {!isCollapsed && <div className="px-3 text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Main Menu</div>}
          {visibleLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.name}
                href={link.href}
                title={isCollapsed ? link.name : undefined}
                className={`flex items-center py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 group relative overflow-hidden ${
                  isActive 
                    ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20 ring-1 ring-slate-900' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent hover:border-slate-200/60'
                } ${isCollapsed ? 'justify-center px-0' : 'px-3'}`}
              >
                {/* Active link background effect */}
                {isActive && (
                  <div className="absolute inset-0 bg-slate-900 opacity-100" />
                )}
                
                <Icon 
                  className={`flex-shrink-0 h-5 w-5 transition-transform duration-300 relative z-10 group-hover:scale-110 ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-900'
                  } ${isCollapsed ? 'mr-0' : 'mr-3'}`} 
                />
                {!isCollapsed && <span className="relative z-10 truncate tracking-tight">{link.name}</span>}
              </Link>
            );
          })}
        </nav>

      </div>

      {/* Logout Button */}
      <div className="p-4 border-t border-slate-200/50 bg-slate-50/50 mt-auto">
        <button
          onClick={logout}
          title={isCollapsed ? 'Sign Out' : undefined}
          className={`flex items-center py-3 text-sm font-semibold text-rose-600 rounded-xl hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all duration-200 group cursor-pointer ${isCollapsed ? 'justify-center w-full px-0' : 'w-full px-4'}`}
        >
          <div className={`bg-rose-100/50 p-1.5 rounded-lg group-hover:bg-rose-200/50 transition-colors ${isCollapsed ? 'mr-0' : 'mr-3'}`}>
            <LogOut className={`h-4 w-4 transition-transform duration-300 ${isCollapsed ? '' : 'group-hover:-translate-x-0.5'}`} />
          </div>
          {!isCollapsed && "Sign Out"}
        </button>
      </div>
    </div>
  );
}


