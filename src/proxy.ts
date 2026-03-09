import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export default function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isVendorRoute = path.startsWith('/vendor');
  const isLoginRoute = path === '/vendor/login';

  const session = request.cookies.get('vendor_session')?.value;

  if (isVendorRoute && !isLoginRoute && !session) {
    return NextResponse.redirect(new URL('/vendor/login', request.url));
  }

  if (isLoginRoute && session) {
    return NextResponse.redirect(new URL('/vendor/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/vendor/:path*']
}
