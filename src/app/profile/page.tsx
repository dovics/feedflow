"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { UserMenu } from "@/components/UserMenu";
import { useThemeSettings } from "@/components/ThemeProvider";
import { DEFAULT_READING_SETTINGS, FONT_FAMILIES, COLOR_PRESETS } from "@/types/reader";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const t = useTranslations('profile');
  const tLanguage = useTranslations('settings.language');
  const tReader = useTranslations('reader');
  const { settings: themeSettings, updateSettings: updateThemeSettings, isLoading: themeLoading } = useThemeSettings();
  const locale = useLocale();
  const [mounted, setMounted] = useState(false);
  const [savingThemeSettings, setSavingThemeSettings] = useState(false);
  const [themeSettingsMessage, setThemeSettingsMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [summaryLanguage, setSummaryLanguage] = useState("zh");
  const [savingSummarySettings, setSavingSummarySettings] = useState(false);
  const [summaryMessage, setSummaryMessage] = useState<string>("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated") {
      fetchUserSettings();
    }
    setMounted(true);
  }, [status, router]);

  const fetchUserSettings = async () => {
    try {
      const res = await fetch("/api/user/settings");
      const data = await res.json();
      if (res.ok && data.user?.summaryLanguage) {
        setSummaryLanguage(data.user.summaryLanguage);
      }
    } catch (error) {
      console.error("Failed to fetch user settings:", error);
    }
  };

  const saveSummarySettings = async () => {
    setSavingSummarySettings(true);
    setSummaryMessage("");
    try {
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summaryLanguage })
      });

      if (res.ok) {
        setSummaryMessage("保存成功");
        setTimeout(() => setSummaryMessage(""), 2000);
      } else {
        const data = await res.json();
        setSummaryMessage(data.error || "保存失败");
      }
    } catch (error) {
      setSummaryMessage("网络错误");
    } finally {
      setSavingSummarySettings(false);
    }
  };

  const handleLanguageChange = (newLocale: string) => {
    document.cookie = `locale=${newLocale}; path=/; max-age=31536000`;
    router.refresh();
  };

  const handleThemeSettingsSave = async () => {
    setSavingThemeSettings(true);
    setThemeSettingsMessage(null);

    try {
      const res = await fetch("/api/reading-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(themeSettings)
      });

      if (res.ok) {
        updateThemeSettings(themeSettings);
        setThemeSettingsMessage({ type: "success", text: tReader('saved') });
        setTimeout(() => setThemeSettingsMessage(null), 2000);
      } else {
        setThemeSettingsMessage({ type: "error", text: "保存失败，请重试" });
      }
    } catch (error) {
      setThemeSettingsMessage({ type: "error", text: "网络错误，请重试" });
    } finally {
      setSavingThemeSettings(false);
    }
  };

  const handleThemeSettingsReset = () => {
    const resetSettings = DEFAULT_READING_SETTINGS;
    updateThemeSettings(resetSettings);
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
    <div className="min-h-screen">
      <nav className="bg-theme-surface-transparent backdrop-blur-sm border-b border-theme px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <a
            href="/"
            className="text-2xl font-bold text-theme-primary hover:text-theme-secondary"
          >
            FeedWise
          </a>
          <div className="flex items-center gap-4">
            <a
              href="/"
              className="text-sm text-theme-secondary hover:text-theme-primary font-medium transition-colors"
            >
              {t('back') || 'Back'}
            </a>
            <UserMenu />
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold text-theme-primary mb-8">
          {t('title')}
        </h1>

        <div className="space-y-6">
          <div className="bg-theme-surface rounded-lg shadow-theme border border-theme p-6">
            <h2 className="text-xl font-semibold text-theme-primary mb-4">
              {tLanguage('title')}
            </h2>
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                {tLanguage('label')}
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => handleLanguageChange('zh')}
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${
                    locale === 'zh'
                      ? 'bg-theme-button-primary text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {tLanguage('zh')}
                </button>
                <button
                  onClick={() => handleLanguageChange('en')}
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${
                    locale === 'en'
                      ? 'bg-theme-button-primary text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {tLanguage('en')}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-theme-surface rounded-lg shadow-theme border border-theme p-6">
            <h2 className="text-xl font-semibold text-theme-primary mb-4">
              {tReader('settings')}
            </h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {tReader('fontSize')}: {themeSettings.fontSize}px
                </label>
                <input
                  type="range"
                  min="12"
                  max="32"
                  value={themeSettings.fontSize}
                  onChange={(e) =>
                    updateThemeSettings({ ...themeSettings, fontSize: parseInt(e.target.value) })
                  }
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>12px</span>
                  <span>32px</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {tReader('lineHeight')}: {themeSettings.lineHeight}
                </label>
                <input
                  type="range"
                  min="1.2"
                  max="2.5"
                  step="0.1"
                  value={themeSettings.lineHeight}
                  onChange={(e) =>
                    updateThemeSettings({ ...themeSettings, lineHeight: parseFloat(e.target.value) })
                  }
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1.2</span>
                  <span>2.5</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {tReader('fontFamily')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {FONT_FAMILIES.map((font) => (
                    <button
                      key={font.label}
                      onClick={() =>
                        updateThemeSettings({
                          ...themeSettings,
                          fontFamily: font.value,
                          fontFamilyName: font.label
                        })
                      }
                      className={`px-4 py-3 rounded-md text-left transition-colors ${
                        themeSettings.fontFamilyName === font.label
                          ? "bg-blue-100 text-blue-700 border-2 border-theme-button-primary"
                          : "bg-gray-100 text-gray-900 border-2 border-transparent hover:border-gray-300"
                      }`}
                      style={{ fontFamily: font.value }}
                    >
                      {font.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {tReader('colorScheme')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() =>
                        updateThemeSettings({
                          ...themeSettings,
                          backgroundColor: preset.backgroundColor,
                          textColor: preset.textColor
                        })
                      }
                      className={`px-4 py-3 rounded-md text-left transition-colors border-2 ${
                        themeSettings.backgroundColor === preset.backgroundColor &&
                        themeSettings.textColor === preset.textColor
                          ? "border-theme-button-primary bg-blue-50"
                          : "border-transparent bg-gray-100 hover:border-gray-300"
                      }`}
                      title={preset.description}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1">
                          <div
                            className="w-6 h-6 rounded border border-gray-300"
                            style={{ backgroundColor: preset.backgroundColor }}
                          />
                          <div
                            className="w-6 h-6 rounded border border-gray-300"
                            style={{ backgroundColor: preset.textColor }}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-sm text-gray-900">
                            {preset.name}
                          </div>
                          <div className="text-xs text-gray-600">
                            {preset.description}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {tReader('customColors')}
                </label>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {tReader('backgroundColor')}
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="color"
                        value={themeSettings.backgroundColor}
                        onChange={(e) =>
                          updateThemeSettings({ ...themeSettings, backgroundColor: e.target.value })
                        }
                        className="w-16 h-10 rounded cursor-pointer border-2 border-gray-300"
                      />
                      <input
                        type="text"
                        value={themeSettings.backgroundColor}
                        onChange={(e) =>
                          updateThemeSettings({ ...themeSettings, backgroundColor: e.target.value })
                        }
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus-ring bg-white text-gray-900"
                        placeholder="#FFFFFF"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {tReader('textColor')}
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="color"
                        value={themeSettings.textColor}
                        onChange={(e) =>
                          updateThemeSettings({ ...themeSettings, textColor: e.target.value })
                        }
                        className="w-16 h-10 rounded cursor-pointer border-2 border-gray-300"
                      />
                      <input
                        type="text"
                        value={themeSettings.textColor}
                        onChange={(e) =>
                          updateThemeSettings({ ...themeSettings, textColor: e.target.value })
                        }
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus-ring bg-white text-gray-900"
                        placeholder="#000000"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <div className="flex gap-3">
                  <button
                    onClick={handleThemeSettingsReset}
                    className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors"
                  >
                    {tReader('reset')}
                  </button>
                  <button
                    onClick={handleThemeSettingsSave}
                    disabled={savingThemeSettings}
                    className="flex-1 px-4 py-2 text-white bg-theme-button-primary hover:bg-theme-button-primary-hover rounded-md transition-colors disabled:opacity-50"
                  >
                    {savingThemeSettings ? tReader('saving') : tReader('save')}
                  </button>
                </div>
              </div>

              {themeSettingsMessage && (
                <div
                  className={`p-3 rounded-md ${
                    themeSettingsMessage.type === "success"
                      ? "bg-green-50 text-green-900"
                      : "bg-red-50 text-red-900"
                  }`}
                >
                  {themeSettingsMessage.text}
                </div>
              )}
            </div>
          </div>

          <div className="bg-theme-surface rounded-lg shadow-theme border border-theme p-6">
            <h2 className="text-xl font-semibold text-theme-primary mb-4">
              每日摘要设置
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-theme-primary mb-2">
                  摘要语言
                </label>
                <div className="flex items-center gap-4">
                  <select
                    value={summaryLanguage}
                    onChange={(e) => setSummaryLanguage(e.target.value)}
                    className="px-4 py-2 border border-theme rounded-md focus-ring bg-theme-input text-theme-text"
                    disabled={savingSummarySettings}
                  >
                    <option value="zh">中文</option>
                    <option value="en">English</option>
                  </select>
                  <button
                    onClick={saveSummarySettings}
                    disabled={savingSummarySettings}
                    className="px-6 py-2 bg-theme-button-primary hover:bg-theme-button-primary-hover text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingSummarySettings ? "保存中..." : "保存设置"}
                  </button>
                </div>
                <p className="mt-2 text-sm text-theme-secondary">
                  选择每日新闻摘要的生成语言。更改后将在下次生成摘要时生效。
                </p>
                {summaryMessage && (
                  <p className={`mt-2 text-sm ${summaryMessage === "保存成功" ? "text-green-600" : "text-red-600"}`}>
                    {summaryMessage}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-theme-surface rounded-lg shadow-theme border border-theme p-6">
            <h2 className="text-xl font-semibold text-theme-primary mb-4">
              {t('manageFeeds')}
            </h2>
            <p className="text-theme-secondary mb-4">
              Manage your RSS feeds and tags
            </p>
            <a
              href="/settings"
              className="inline-flex items-center px-4 py-2 bg-theme-button-primary hover:bg-theme-button-primary-hover text-white rounded-md font-medium transition-colors"
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
