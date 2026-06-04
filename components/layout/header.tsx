'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';
import {
  Database,
  LineChart,
  LayoutDashboard,
  Home,
  BarChart3,
  AlertTriangle,
  Server,
  Calculator,
  FileText,
  Bell,
  Zap,
  LogOut,
  User,
  Menu,
  ChevronDown,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

type NavItem = { name: string; href: string; icon: typeof Home };

// Primary destinations shown inline on large screens.
const primaryNav: NavItem[] = [
  { name: 'Data Navigator', href: '/data-navigator', icon: Database },
  { name: 'Explorer', href: '/explorer', icon: LineChart },
  { name: 'Charts', href: '/charts', icon: BarChart3 },
  { name: 'Anomalies', href: '/anomalies', icon: AlertTriangle },
  { name: 'Dashboards', href: '/dashboards', icon: LayoutDashboard },
];

// Secondary destinations grouped under a "More" menu on large screens.
const secondaryNav: NavItem[] = [
  { name: 'Data Sources', href: '/data-sources', icon: Server },
  { name: 'Calculations', href: '/calculations', icon: Calculator },
  { name: 'Alerts', href: '/alerts', icon: Bell },
  { name: 'Reports', href: '/reports', icon: FileText },
];

// Full list (incl. Home) used by the mobile menu.
const allNav: NavItem[] = [{ name: 'Home', href: '/', icon: Home }, ...primaryNav, ...secondaryNav];

export function Header() {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/auth/signin' });
  };

  const getUserInitials = () => {
    if (session?.user?.name) {
      return session.user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return session?.user?.username?.[0]?.toUpperCase() || 'U';
  };

  const showUserMenu = mounted && session;
  const secondaryActive = secondaryNav.some((item) => isActive(item.href));

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container flex h-16 items-center gap-2">
        {/* Logo & Brand */}
        <Link href="/" className="mr-4 flex items-center gap-2.5 lg:mr-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Zap className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <span className="text-base font-semibold text-foreground">IoT Analytics</span>
            <div className="text-[10px] text-muted-foreground">Platform</div>
          </div>
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden flex-1 items-center gap-1 lg:flex">
          {primaryNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-accent text-foreground'
                    : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.name}</span>
              </Link>
            );
          })}

          {/* "More" menu for secondary destinations */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  secondaryActive
                    ? 'bg-accent text-foreground'
                    : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
                )}
              >
                More
                <ChevronDown className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {secondaryNav.map((item) => {
                const Icon = item.icon;
                return (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link href={item.href} className="cursor-pointer">
                      <Icon className="mr-2 h-4 w-4" />
                      {item.name}
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        {/* Spacer for mobile (pushes actions right) */}
        <div className="flex-1 lg:hidden" />

        {/* Actions */}
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-full border border-border px-3 py-1.5 sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            <span className="font-mono text-xs text-muted-foreground">v3.0.0</span>
          </div>

          <ThemeToggle />

          {/* User menu */}
          {showUserMenu && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
                  <Avatar className="h-9 w-9 border border-border">
                    <AvatarFallback className="bg-primary text-sm font-semibold text-primary-foreground">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {session.user?.name || session.user?.username}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {session.user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-destructive focus:text-destructive"
                  onClick={handleSignOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Mobile navigation menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation menu">
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Navigation</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {allNav.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link
                      href={item.href}
                      className={cn('cursor-pointer', active && 'bg-accent text-foreground')}
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      {item.name}
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
