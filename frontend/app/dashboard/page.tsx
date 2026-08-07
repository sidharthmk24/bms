"use client";

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || !user) return;

    switch (user.primaryRole || (user.roles && user.roles[0])) {
      case 'SUPER_ADMIN':
        router.replace('/dashboard/super-admin');
        break;
      case 'ADMIN':
        router.replace('/dashboard/admin');
        break;
      case 'CENTRAL_INVENTORY_MANAGER':
        router.replace('/dashboard/central-inventory');
        break;
      case 'FINANCE':
        router.replace('/dashboard/finance');
        break;
      case 'BRANCH_MANAGER':
        router.replace('/dashboard/branch-manager');
        break;
      case 'BRANCH_INVENTORY':
        router.replace('/dashboard/branch-inventory');
        break;
      case 'BRANCH_FRONT_OFFICE':
        router.replace('/dashboard/branch-front-office');
        break;
      default:
        // Fallback
        break;
    }
  }, [user, isLoading, router]);

  return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-pulse flex space-x-2 items-center">
        <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
        <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
        <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
      </div>
    </div>
  );
}
