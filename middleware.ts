import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Pages that don't require authentication
const publicPages = ['/', '/auth/signin', '/auth/signup', '/auth/login'];

export async function middleware(request: NextRequest) {
  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  
  const isAuthenticated = !!token;
  const isAuthPage = request.nextUrl.pathname.startsWith('/auth');
  const isPublicPage = publicPages.includes(request.nextUrl.pathname);

  // Redirect authenticated users away from auth pages (except /auth/*)
  if (isAuthenticated && isAuthPage && request.nextUrl.pathname !== '/') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Allow public pages without authentication
  if (isPublicPage) {
    return NextResponse.next();
  }

  // Redirect unauthenticated users to sign-in (for protected pages)
  if (!isAuthenticated) {
    const signInUrl = new URL('/auth/signin', request.url);
    signInUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};
