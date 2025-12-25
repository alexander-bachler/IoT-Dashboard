import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/layout/header';
import { StatusBar } from '@/components/layout/status-bar';
import { CommandPalette } from '@/components/layout/command-palette';
import { QuickActionsFAB } from '@/components/layout/quick-actions-fab';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'IoT Time-Series Analytics Platform',
  description: 'Professional IoT data visualization and analytics platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <Header />
          <main className="min-h-[calc(100vh-4rem-2rem)]">{children}</main>
          <StatusBar />
          <CommandPalette />
          <QuickActionsFAB />
          <Toaster
            position="top-right"
            toastOptions={{
              classNames: {
                toast: 'glass-card',
                title: 'text-foreground',
                description: 'text-muted-foreground',
                actionButton: 'bg-primary text-primary-foreground',
                cancelButton: 'bg-muted text-muted-foreground',
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
