import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('seo_admin_token')?.value;
  const { pathname } = request.nextUrl;

  // Paths that only guests should see (logged-in users shouldn't access)
  const guestOnlyPaths = ['/login'];
  // Paths that anyone can see (logged-in or not)
  const fullyPublicPaths = ['/docs'];

  const isGuestOnlyPath = guestOnlyPaths.some((path) => pathname.startsWith(path));
  const isFullyPublicPath = fullyPublicPaths.some((path) => pathname.startsWith(path));
  const isPublicPath = isGuestOnlyPath || isFullyPublicPath;

  // If user is not authenticated and trying to access a protected route
  if (!token && !isPublicPath) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // If user is authenticated and trying to access a guest-only page (like /login)
  if (token && isGuestOnlyPath) {
    const dashboardUrl = new URL('/', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

// Apply this middleware to everything except static assets and API routes
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
