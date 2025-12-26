'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Download,
  Upload,
  RefreshCw,
  BarChart3,
  Database,
  Workflow,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface QuickAction {
  icon: React.ElementType;
  label: string;
  action: () => void;
  color: string;
}

export function QuickActionsFAB() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const quickActions: QuickAction[] = [
    {
      icon: BarChart3,
      label: 'New Chart',
      action: () => {
        router.push('/charts');
        setIsOpen(false);
        toast.success('Opening Chart Builder');
      },
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: Workflow,
      label: 'New ETL Pipeline',
      action: () => {
        router.push('/data-navigator?tab=etl');
        setIsOpen(false);
        toast.success('Opening ETL Designer');
      },
      color: 'from-purple-500 to-pink-500',
    },
    {
      icon: Database,
      label: 'Add Data Source',
      action: () => {
        router.push('/data-navigator?tab=sources');
        setIsOpen(false);
        toast.success('Opening Data Navigator');
      },
      color: 'from-green-500 to-emerald-500',
    },
    {
      icon: Download,
      label: 'Export Data',
      action: () => {
        setIsOpen(false);
        toast.success('Starting data export...');
      },
      color: 'from-orange-500 to-amber-500',
    },
    {
      icon: Upload,
      label: 'Import Data',
      action: () => {
        setIsOpen(false);
        toast.info('Import dialog opened');
      },
      color: 'from-indigo-500 to-purple-500',
    },
    {
      icon: RefreshCw,
      label: 'Refresh All',
      action: () => {
        setIsOpen(false);
        toast.success('Refreshing data...');
        setTimeout(() => window.location.reload(), 500);
      },
      color: 'from-teal-500 to-cyan-500',
    },
  ];

  return (
    <div className="fixed bottom-24 right-8 z-50 flex flex-col-reverse items-end gap-3">
      {/* Quick Action Buttons */}
      {isOpen && (
        <>
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <div
                key={action.label}
                className="flex items-center gap-3 animate-slide-up"
                style={{
                  animationDelay: `${index * 50}ms`,
                  animationFillMode: 'backwards',
                }}
              >
                <div className="px-3 py-1.5 rounded-lg glass-card text-sm font-medium whitespace-nowrap opacity-0 animate-fade-in">
                  {action.label}
                </div>
                <Button
                  size="icon"
                  className={cn(
                    'h-12 w-12 rounded-full shadow-glow-lg',
                    'bg-gradient-to-r',
                    action.color,
                    'hover:scale-110 transition-transform'
                  )}
                  onClick={action.action}
                >
                  <Icon className="h-5 w-5 text-white" />
                </Button>
              </div>
            );
          })}
        </>
      )}

      {/* Main FAB */}
      <Button
        size="icon"
        className={cn(
          'h-14 w-14 rounded-full shadow-glow-lg',
          'bg-gradient-to-r from-blue-500 to-purple-600',
          'hover:scale-110 transition-all duration-300',
          isOpen && 'rotate-45'
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <Plus className="h-6 w-6 text-white" />
        )}
      </Button>
    </div>
  );
}
