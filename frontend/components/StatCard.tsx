import React from 'react';
import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  color?: 'blue' | 'green' | 'red' | 'purple' | 'amber' | 'plum';
}

const colorMap = {
  plum: 'bg-[#faedf5] text-[#7e2562]',
  blue: 'bg-sky-50 text-sky-600',
  green: 'bg-[#f0fbf5] text-[#3cb976]',
  red: 'bg-[#fef5f2] text-[#e45e34]',
  purple: 'bg-[#faf0f7] text-[#9b3179]',
  amber: 'bg-[#fffbeb] text-[#d97706]',
};

export function StatCard({ title, value, icon: Icon, trend, trendUp, color = 'plum' }: StatCardProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-sm border border-[#7e2562]/12 p-5 shadow-plum-sm hover:border-[#7e2562]/25 hover:shadow-plum-md transition-all"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider truncate">{title}</p>
        <div className={`p-2 rounded-sm ${colorMap[color] || colorMap.plum}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="mt-3 flex items-baseline">
        <p className="text-2xl font-black tracking-tight text-foreground">{value}</p>
      </div>
      {trend && (
        <div className="mt-2 flex items-center text-xs">
          <span className={`font-bold ${trendUp ? 'text-success' : 'text-danger'}`}>
            {trend}
          </span>
          <span className="ml-2 text-muted-foreground text-[10px] uppercase tracking-wide">vs last month</span>
        </div>
      )}
    </motion.div>
  );
}
