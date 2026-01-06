import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { cookies } from 'next/headers';
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import { RootProviders } from "@/components/RootProviders";
import { notFound } from "next/navigation";
import { locales, defaultLocale } from '@/i18n/navigation';

export const metadata = {
  title: "FeedFlow - RSS Reader",
  description: "Simple RSS reader application",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('locale')?.value;
  let locale: 'en' | 'zh' = defaultLocale;

  if (cookieLocale && locales.includes(cookieLocale as any)) {
    locale = cookieLocale as 'en' | 'zh';
  }

  if (!locales.includes(locale)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="antialiased">
        <AuthProvider>
          <NextIntlClientProvider locale={locale} messages={messages} timeZone="Asia/Shanghai">
            <RootProviders>
              {children}
            </RootProviders>
          </NextIntlClientProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
