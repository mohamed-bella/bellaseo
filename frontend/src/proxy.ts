import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const token = request.cookies.get('seo_admin_token')?.value;
  const { pathname } = request.nextUrl;

  const guestOnlyPaths = ['/login'];
  const fullyPublicPaths = ['/docs'];

  const isGuestOnlyPath = guestOnlyPaths.some((path) => pathname.startsWith(path));
  const isFullyPublicPath = fullyPublicPaths.some((path) => pathname.startsWith(path));
  const isPublicPath = isGuestOnlyPath || isFullyPublicPath;

  if (!token && !isPublicPath) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

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
