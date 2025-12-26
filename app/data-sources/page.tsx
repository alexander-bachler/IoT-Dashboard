'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function DataSourcesRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to Data Navigator with datasources tab
    router.replace('/data-navigator');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground">Redirecting to Data Navigator...</p>
      </div>
    </div>
  );
}
