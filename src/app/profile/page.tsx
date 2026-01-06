"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useTheme } from "next-themes";
import { UserMenu } from "@/components/UserMenu";
import { ReadingSettings, DEFAULT_READING_SETTINGS, FONT_FAMILIES, COLOR_PRESETS } from "@/types/reader";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const t = useTranslations('profile');
  const tLanguage = useTranslations('settings.language');
  const tTheme = useTranslations('settings.theme');
  const tReader = useTranslations('reader');
  const { theme, setTheme } = useTheme();
  const locale = useLocale();
  const [mounted, setMounted] = useState(false);
  const [readingSettings, setReadingSettings] = useState<ReadingSettings>(DEFAULT_READING_SETTINGS);
  const [savingReadingSettings, setSavingReadingSettings] = useState(false);
  const [readingSettingsMessage, setReadingSettingsMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
    setMounted(true);
  }, [status, router]);

  useEffect(() => {
    const fetchReadingSettings = async () => {
      try {
        const res = await fetch("/api/reading-settings");
        const data = await res.json();
        if (data.settings) {
          setReadingSettings(data.settings);
        }
      } catch (error) {
        console.error("Failed to fetch reading settings:", error);
      }
    };

    if (session?.user) {
      fetchReadingSettings();
    }
  }, [session]);

  const handleLanguageChange = (newLocale: string) => {
    document.cookie = `locale=${newLocale}; path=/; max-age=31536000`;
    router.refresh();
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
  };

  const handleReadingSettingsSave = async () => {
    setSavingReadingSettings(true);
    setReadingSettingsMessage(null);

    try {
      const res = await fetch("/api/reading-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(readingSettings)
      });

      if (res.ok) {
        setReadingSettingsMessage({ type: "success", text: tReader('saved') });
        setTimeout(() => setReadingSettingsMessage(null), 2000);
      } else {
        setReadingSettingsMessage({ type: "error", text: "保存失败，请重试" });
      }
    } catch (error) {
      setReadingSettingsMessage({ type: "error", text: "网络错误，请重试" });
    } finally {
      setSavingReadingSettings(false);
    }
  };

  const handleReadingSettingsReset = () => {
    setReadingSettings(DEFAULT_READING_SETTINGS);
  };

  if (status === "loading" || !mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <a
            href="/"
            className="text-2xl font-bold text-gray-900 dark:text-white hover:text-gray-700 dark:hover:text-gray-300"
          >
            FeedFlow
          </a>
          <div className="flex items-center gap-4">
            <a
              href="/"
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-medium transition-colors"
            >
              {t('back') || 'Back'}
            </a>
            <UserMenu />
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          {t('title')}
        </h1>

        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {tLanguage('title')}
            </h2>
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {tLanguage('label')}
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => handleLanguageChange('zh')}
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${
                    locale === 'zh'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {tLanguage('zh')}
                </button>
                <button
                  onClick={() => handleLanguageChange('en')}
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${
                    locale === 'en'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {tLanguage('en')}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {tTheme('title')}
            </h2>
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {tTheme('label')}
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => handleThemeChange('light')}
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${
                    theme === 'light'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {tTheme('light')}
                </button>
                <button
                  onClick={() => handleThemeChange('dark')}
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${
                    theme === 'dark'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {tTheme('dark')}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {tReader('settings')}
            </h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {tReader('fontSize')}: {readingSettings.fontSize}px
                </label>
                <input
                  type="range"
                  min="12"
                  max="32"
                  value={readingSettings.fontSize}
                  onChange={(e) =>
                    setReadingSettings({ ...readingSettings, fontSize: parseInt(e.target.value) })
                  }
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>12px</span>
                  <span>32px</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {tReader('lineHeight')}: {readingSettings.lineHeight}
                </label>
                <input
                  type="range"
                  min="1.2"
                  max="2.5"
                  step="0.1"
                  value={readingSettings.lineHeight}
                  onChange={(e) =>
                    setReadingSettings({ ...readingSettings, lineHeight: parseFloat(e.target.value) })
                  }
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>1.2</span>
                  <span>2.5</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {tReader('fontFamily')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {FONT_FAMILIES.map((font) => (
                    <button
                      key={font.label}
                      onClick={() =>
                        setReadingSettings({
                          ...readingSettings,
                          fontFamily: font.value,
                          fontFamilyName: font.label
                        })
                      }
                      className={`px-4 py-3 rounded-md text-left transition-colors ${
                        readingSettings.fontFamilyName === font.label
                          ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-2 border-blue-500"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600"
                      }`}
                      style={{ fontFamily: font.value }}
                    >
                      {font.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {tReader('colorScheme')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() =>
                        setReadingSettings({
                          ...readingSettings,
                          backgroundColor: preset.backgroundColor,
                          textColor: preset.textColor
                        })
                      }
                      className={`px-4 py-3 rounded-md text-left transition-colors border-2 ${
                        readingSettings.backgroundColor === preset.backgroundColor &&
                        readingSettings.textColor === preset.textColor
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                          : "border-transparent bg-gray-100 dark:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                      }`}
                      title={preset.description}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1">
                          <div
                            className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600"
                            style={{ backgroundColor: preset.backgroundColor }}
                          />
                          <div
                            className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600"
                            style={{ backgroundColor: preset.textColor }}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-sm text-gray-900 dark:text-white">
                            {preset.name}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {preset.description}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {tReader('customColors')}
                </label>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {tReader('backgroundColor')}
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="color"
                        value={readingSettings.backgroundColor}
                        onChange={(e) =>
                          setReadingSettings({ ...readingSettings, backgroundColor: e.target.value })
                        }
                        className="w-16 h-10 rounded cursor-pointer border-2 border-gray-300 dark:border-gray-600"
                      />
                      <input
                        type="text"
                        value={readingSettings.backgroundColor}
                        onChange={(e) =>
                          setReadingSettings({ ...readingSettings, backgroundColor: e.target.value })
                        }
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                        placeholder="#FFFFFF"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {tReader('textColor')}
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="color"
                        value={readingSettings.textColor}
                        onChange={(e) =>
                          setReadingSettings({ ...readingSettings, textColor: e.target.value })
                        }
                        className="w-16 h-10 rounded cursor-pointer border-2 border-gray-300 dark:border-gray-600"
                      />
                      <input
                        type="text"
                        value={readingSettings.textColor}
                        onChange={(e) =>
                          setReadingSettings({ ...readingSettings, textColor: e.target.value })
                        }
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                        placeholder="#000000"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex gap-3">
                  <button
                    onClick={handleReadingSettingsReset}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-md transition-colors"
                  >
                    {tReader('reset')}
                  </button>
                  <button
                    onClick={handleReadingSettingsSave}
                    disabled={savingReadingSettings}
                    className="flex-1 px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50"
                  >
                    {savingReadingSettings ? tReader('saving') : tReader('save')}
                  </button>
                </div>
              </div>

              {readingSettingsMessage && (
                <div
                  className={`p-3 rounded-md ${
                    readingSettingsMessage.type === "success"
                      ? "bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-300"
                      : "bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-300"
                  }`}
                >
                  {readingSettingsMessage.text}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {t('manageFeeds')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Manage your RSS feeds and tags
            </p>
            <a
              href="/settings"
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
            >
              {t('manageFeeds')}
              <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
