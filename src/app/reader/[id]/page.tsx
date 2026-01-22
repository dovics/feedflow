"use client";

import { useEffect, useState, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ReaderContent } from "@/components/ReaderContent";
import { ReaderSettings } from "@/components/ReaderSettings";
import { useThemeSettings } from "@/components/ThemeProvider";
import { DEFAULT_READING_SETTINGS } from "@/types/reader";

interface Item {
  id: string;
  title: string;
  link: string;
  description: string;
  pubDate: string;
  feed: {
    title: string;
  };
}

export default function ReaderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const t = useTranslations();
  const tNav = useTranslations('nav');
  const tCommon = useTranslations('common');
  const { settings } = useThemeSettings();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    const fetchItem = async () => {
      try {
        // 首先尝试从 sessionStorage 获取（从首页传入的数据）
        const cachedItem = sessionStorage.getItem(`feedwise_item_${id}`);

        if (cachedItem) {
          const parsedItem = JSON.parse(cachedItem);
          setItem(parsedItem);
          setLoading(false);
          // 清除缓存，避免旧数据残留
          sessionStorage.removeItem(`feedwise_item_${id}`);
          return;
        }

        // 如果没有缓存数据，则调用 API 获取
        const res = await fetch(`/api/items/${id}`);

        if (!res.ok) {
          if (res.status === 404) {
            setError(t('reader.errorNotFound') || "Article not found");
          } else {
            setError(t('reader.errorLoading') || "Failed to load article");
          }
          return;
        }

        const data = await res.json();
        setItem(data.item);
      } catch (error) {
        console.error("Failed to fetch item:", error);
        setError(t('reader.errorLoading') || "Failed to load article");
      } finally {
        setLoading(false);
      }
    };

    if (session?.user) {
      fetchItem();
    }
  }, [id, session, t]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">{tCommon('loading')}</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-600 text-lg mb-4">{error}</div>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-md"
          >
            {tNav('home')}
          </button>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-gray-600 text-lg mb-4">{t('reader.errorNotFound') || "Article not found"}</div>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-md"
          >
            {tNav('home')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-40 bg-theme-surface-transparent backdrop-blur-sm border-b border-theme px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/")}
              className="text-theme-secondary hover:text-theme-primary flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              {tCommon('back')}
            </button>
            <span className="text-theme-primary font-medium">{tNav('title')}</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSettingsOpen(true)}
              className="px-4 py-2 text-sm text-accent hover:bg-accent/10 rounded-md transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 001.066 2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-1.066 2.573c.94-1.543-.826-3.31-2.37-2.37a1.724 1.724 0 00-1.065 2.573c.426-1.756-2.924-1.756-3.35 0a1.724 1.724 0 00-1.066 2.573c.94-1.543-.826-3.31-2.37-2.37a1.724 1.724 0 00-1.065 2.572c-.426 1.756 2.924 1.756 3.35 0a1.724 1.724 0 00-1.066-2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 001.065-2.572c1.756-.426 1.756-2.924 0-3.35a1.724 1.724 0 00-1.066 2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {t('reader.settings')}
            </button>
            <span className="text-theme-primary hidden sm:inline">
              {session.user.email}
            </span>
          </div>
        </div>
      </nav>

      <div className="pt-20">
        <ReaderContent
          title={item.title}
          description={item.description}
          link={item.link}
          feedTitle={item.feed.title}
          pubDate={item.pubDate}
          settings={settings}
        />
      </div>

      <ReaderSettings
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
}
