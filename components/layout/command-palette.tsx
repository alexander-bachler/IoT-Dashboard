'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Home,
  Database,
  LineChart,
  BarChart3,
  AlertTriangle,
  LayoutDashboard,
  Download,
  Upload,
  RefreshCw,
  Moon,
  Sun,
} from 'lucide-react';
import { useTheme } from 'next-themes';

interface Command {
  icon: React.ElementType;
  label: string;
  action: () => void;
  group: 'navigation' | 'actions' | 'settings';
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { setTheme, theme } = useTheme();

  // CMD+K or CTRL+K to open
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const commands: Command[] = [
    // Navigation
    {
      icon: Home,
      label: 'Home',
      action: () => {
        router.push('/');
        setOpen(false);
      },
      group: 'navigation',
    },
    {
      icon: Database,
      label: 'Data Navigator',
      action: () => {
        router.push('/data-navigator');
        setOpen(false);
      },
      group: 'navigation',
    },
    {
      icon: LineChart,
      label: 'Explorer',
      action: () => {
        router.push('/explorer');
        setOpen(false);
      },
      group: 'navigation',
    },
    {
      icon: BarChart3,
      label: 'Charts',
      action: () => {
        router.push('/charts');
        setOpen(false);
      },
      group: 'navigation',
    },
    {
      icon: AlertTriangle,
      label: 'Anomalies',
      action: () => {
        router.push('/anomalies');
        setOpen(false);
      },
      group: 'navigation',
    },
    {
      icon: LayoutDashboard,
      label: 'Dashboards',
      action: () => {
        router.push('/dashboards');
        setOpen(false);
      },
      group: 'navigation',
    },
    // Actions
    {
      icon: RefreshCw,
      label: 'Refresh Data',
      action: () => {
        window.location.reload();
        setOpen(false);
      },
      group: 'actions',
    },
    {
      icon: Download,
      label: 'Export Data',
      action: () => {
        // This would trigger export logic
        console.log('Export data');
        setOpen(false);
      },
      group: 'actions',
    },
    {
      icon: Upload,
      label: 'Import Data',
      action: () => {
        // This would trigger import logic
        console.log('Import data');
        setOpen(false);
      },
      group: 'actions',
    },
    // Settings
    {
      icon: theme === 'dark' ? Sun : Moon,
      label: theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode',
      action: () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
        setOpen(false);
      },
      group: 'settings',
    },
  ];

  const navigationCommands = commands.filter((c) => c.group === 'navigation');
  const actionCommands = commands.filter((c) => c.group === 'actions');
  const settingCommands = commands.filter((c) => c.group === 'settings');

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." className="h-12" />
      <CommandList className="max-h-[400px]">
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigation">
          {navigationCommands.map((command) => {
            const Icon = command.icon;
            return (
              <CommandItem
                key={command.label}
                onSelect={command.action}
                className="flex items-center gap-3 px-4 py-3 cursor-pointer"
              >
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span>{command.label}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Actions">
          {actionCommands.map((command) => {
            const Icon = command.icon;
            return (
              <CommandItem
                key={command.label}
                onSelect={command.action}
                className="flex items-center gap-3 px-4 py-3 cursor-pointer"
              >
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span>{command.label}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Settings">
          {settingCommands.map((command) => {
            const Icon = command.icon;
            return (
              <CommandItem
                key={command.label}
                onSelect={command.action}
                className="flex items-center gap-3 px-4 py-3 cursor-pointer"
              >
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span>{command.label}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
