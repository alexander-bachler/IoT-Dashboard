'use client';

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { setSessionTokenGetter } from '@/lib/api/client';

function SessionTokenSetter({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();

  useEffect(() => {
    // Set the session token getter for API client
    setSessionTokenGetter(() => session?.accessToken || null);
  }, [session]);

  return <>{children}</>;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthSessionProvider>
      <SessionTokenSetter>{children}</SessionTokenSetter>
    </NextAuthSessionProvider>
  );
}
