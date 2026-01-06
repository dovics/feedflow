import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { locales, defaultLocale } from './src/i18n/navigation';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip API routes and static files
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Detect locale from cookie or Accept-Language header
  let locale = request.cookies.get('locale')?.value;

  if (!locale) {
    const acceptLanguage = request.headers.get('accept-language');
    if (acceptLanguage) {
      const acceptedLocales = acceptLanguage
        .split(',')
        .map((lang) => lang.split(';')[0].trim());

      // Find first matching locale
      locale = acceptedLocales.find((lang) =>
        locales.some((locale) => lang.startsWith(locale))
      );
    }
  }

  // Fallback to default locale
  if (!locale || !locales.includes(locale as any)) {
    locale = defaultLocale;
  }

  // Create response with locale cookie
  const response = NextResponse.next();
  if (!request.cookies.get('locale')) {
    response.cookies.set('locale', locale, {
      maxAge: 365 * 24 * 60 * 60, // 1 year
      path: '/',
    });
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next|_vercel|.*\\..*).*)'
  ]
};
