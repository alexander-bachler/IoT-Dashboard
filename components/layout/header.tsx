'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Database, LineChart, LayoutDashboard, Home, BarChart3, AlertTriangle, Workflow, Zap } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';

const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Data Sources', href: '/data-sources', icon: Database },
  { name: 'Data Navigator', href: '/data-navigator', icon: Workflow },
  { name: 'Explorer', href: '/explorer', icon: LineChart },
  { name: 'Charts', href: '/charts', icon: BarChart3 },
  { name: 'Anomalies', href: '/anomalies', icon: AlertTriangle },
  { name: 'Dashboards', href: '/dashboards', icon: LayoutDashboard },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 glass-card animate-slide-down">
      <div className="container flex h-16 items-center">
        {/* Logo & Brand */}
        <Link href="/" className="mr-8 flex items-center gap-3 group">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg blur-md opacity-75 group-hover:opacity-100 transition-opacity" />
            <div className="relative bg-gradient-to-r from-blue-500 to-purple-600 p-2 rounded-lg">
              <Zap className="h-5 w-5 text-white" />
            </div>
          </div>
          <div>
            <span className="text-xl font-bold gradient-text">IoT Analytics</span>
            <div className="text-[10px] text-muted-foreground font-mono">Enterprise Platform</div>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-1 flex-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                  'hover:scale-105 hover:-translate-y-0.5',
                  isActive
                    ? 'bg-gradient-to-r from-blue-500/20 to-purple-600/20 text-foreground shadow-glow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                )}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-600/10 rounded-xl blur-sm" />
                )}
                <Icon className={cn('h-4 w-4 relative z-10', isActive && 'text-blue-500')} />
                <span className="relative z-10">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-600/10 border border-blue-500/20">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse-subtle" />
            <span className="text-xs font-mono text-muted-foreground">v2.1.0</span>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
