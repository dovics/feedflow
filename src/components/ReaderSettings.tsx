"use client";

import { useState, useEffect } from "react";
import { ReadingSettings, FONT_FAMILIES, DEFAULT_READING_SETTINGS, COLOR_PRESETS } from "@/types/reader";

interface ReaderSettingsProps {
  settings: ReadingSettings;
  onSettingsChange: (settings: ReadingSettings) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function ReaderSettings({
  settings,
  onSettingsChange,
  isOpen,
  onClose
}: ReaderSettingsProps) {
  const [localSettings, setLocalSettings] = useState<ReadingSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/reading-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(localSettings)
      });

      if (res.ok) {
        onSettingsChange(localSettings);
        setMessage({ type: "success", text: "设置已保存" });
        setTimeout(() => setMessage(null), 2000);
      } else {
        setMessage({ type: "error", text: "保存失败，请重试" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "网络错误，请重试" });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setLocalSettings(DEFAULT_READING_SETTINGS);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">阅读设置</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              字体大小: {localSettings.fontSize}px
            </label>
            <input
              type="range"
              min="12"
              max="32"
              value={localSettings.fontSize}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, fontSize: parseInt(e.target.value) })
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
              行间距: {localSettings.lineHeight}
            </label>
            <input
              type="range"
              min="1.2"
              max="2.5"
              step="0.1"
              value={localSettings.lineHeight}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, lineHeight: parseFloat(e.target.value) })
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
              字体选择
            </label>
            <div className="grid grid-cols-2 gap-2">
              {FONT_FAMILIES.map((font) => (
                <button
                  key={font.label}
                  onClick={() =>
                    setLocalSettings({
                      ...localSettings,
                      fontFamily: font.value,
                      fontFamilyName: font.label
                    })
                  }
                  className={`px-4 py-3 rounded-md text-left transition-colors ${
                    localSettings.fontFamilyName === font.label
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
              配色方案
            </label>
            <div className="grid grid-cols-2 gap-2">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() =>
                    setLocalSettings({
                      ...localSettings,
                      backgroundColor: preset.backgroundColor,
                      textColor: preset.textColor
                    })
                  }
                  className={`px-4 py-3 rounded-md text-left transition-colors border-2 ${
                    localSettings.backgroundColor === preset.backgroundColor &&
                    localSettings.textColor === preset.textColor
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
              自定义颜色
            </label>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  背景颜色
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="color"
                    value={localSettings.backgroundColor}
                    onChange={(e) =>
                      setLocalSettings({ ...localSettings, backgroundColor: e.target.value })
                    }
                    className="w-16 h-10 rounded cursor-pointer border-2 border-gray-300 dark:border-gray-600"
                  />
                  <input
                    type="text"
                    value={localSettings.backgroundColor}
                    onChange={(e) =>
                      setLocalSettings({ ...localSettings, backgroundColor: e.target.value })
                    }
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    placeholder="#FFFFFF"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  文本颜色
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="color"
                    value={localSettings.textColor}
                    onChange={(e) =>
                      setLocalSettings({ ...localSettings, textColor: e.target.value })
                    }
                    className="w-16 h-10 rounded cursor-pointer border-2 border-gray-300 dark:border-gray-600"
                  />
                  <input
                    type="text"
                    value={localSettings.textColor}
                    onChange={(e) =>
                      setLocalSettings({ ...localSettings, textColor: e.target.value })
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
                onClick={handleReset}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-md transition-colors"
              >
                重置默认
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50"
              >
                {saving ? "保存中..." : "保存设置"}
              </button>
            </div>
          </div>

          {message && (
            <div
              className={`p-3 rounded-md ${
                message.type === "success"
                  ? "bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-300"
                  : "bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-300"
              }`}
            >
              {message.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
