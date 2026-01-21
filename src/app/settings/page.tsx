"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { UserMenu } from "@/components/UserMenu";

interface Feed {
  id: string;
  title: string;
  url: string;
  tags: string[];
  defaultReadStatus: boolean;
  titleFilter?: string | null;
  createdAt: string;
  _count: {
    items: number;
  };
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const t = useTranslations();
  const tSettings = useTranslations('settings');
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTagsId, setEditingTagsId] = useState<string | null>(null);
  const [editingTags, setEditingTags] = useState("");
  const [batchEditMode, setBatchEditMode] = useState(false);
  const [selectedFeeds, setSelectedFeeds] = useState<Set<string>>(new Set());
  const [batchTags, setBatchTags] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState<Set<string>>(new Set());
  const [editingFeedId, setEditingFeedId] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState({
    tags: "",
    defaultReadStatus: false,
    titleFilter: ""
  });
  const [showAddFeed, setShowAddFeed] = useState(false);
  const [newFeedUrl, setNewFeedUrl] = useState("");
  const [newFeedTitleFilter, setNewFeedTitleFilter] = useState("");
  const [newFeedDefaultReadStatus, setNewFeedDefaultReadStatus] = useState(false);
  const [newFeedTags, setNewFeedTags] = useState("");
  const [addingFeed, setAddingFeed] = useState(false);
  const [addFeedError, setAddFeedError] = useState("");
  const [cleanupSettings, setCleanupSettings] = useState({
    itemRetentionDays: -1,
    itemRetentionOnlyRead: true,
    lastItemCleanup: null as string | null
  });
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [executingCleanup, setExecutingCleanup] = useState(false);
  const [cleanupStats, setCleanupStats] = useState({
    eligibleCount: 0,
    message: ""
  });
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    failed: number;
    skipped: number;
    details?: any;
  } | null>(null);
  const [importError, setImportError] = useState("");
  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated") {
      fetchFeeds();
      fetchCleanupSettings();
      fetchCleanupStats();
    }
  }, [status, router]);

  const fetchFeeds = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/feeds");
      const data = await res.json();
      if (res.ok) {
        setFeeds(data.feeds);
      } else {
        setError(data.error || t('errors.unknown'));
      }
    } catch (error) {
      console.error("Failed to fetch feeds:", error);
      setError(t('errors.network'));
    } finally {
      setLoading(false);
    }
  };

  const updateFeedTags = async (feedId: string, tags: string[]) => {
    try {
      setSaving(feedId);
      const res = await fetch(`/api/feeds/${feedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags })
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || t('errors.unknown'));
        return;
      }

      await fetchFeeds();
      setError("");
    } catch (error) {
      setError(t('errors.network'));
    } finally {
      setSaving(null);
    }
  };

  const updateFeed = async (feedId: string, tags: string[], defaultReadStatus: boolean, titleFilter?: string) => {
    try {
      setSaving(feedId);
      const body: any = { tags, defaultReadStatus };
      if (titleFilter !== undefined) {
        body.titleFilter = titleFilter || null;
      }

      const res = await fetch(`/api/feeds/${feedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || t('errors.unknown'));
        return;
      }

      await fetchFeeds();
      setEditingFeedId(null);
      setEditingForm({ tags: "", defaultReadStatus: false, titleFilter: "" });
      setError("");
    } catch (error) {
      setError(t('errors.network'));
    } finally {
      setSaving(null);
    }
  };

  const addTagsToFeed = async (feedId: string, tags: string[]) => {
    try {
      setSaving(feedId);
      const res = await fetch(`/api/feeds/${feedId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", tags })
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || t('errors.unknown'));
        return;
      }

      await fetchFeeds();
      setEditingTagsId(null);
      setEditingTags("");
      setError("");
    } catch (error) {
      setError(t('errors.network'));
    } finally {
      setSaving(null);
    }
  };

  const removeTagFromFeed = async (feedId: string, tag: string) => {
    try {
      const res = await fetch(`/api/feeds/${feedId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", tags: [tag] })
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || t('errors.unknown'));
        return;
      }

      await fetchFeeds();
      setError("");
    } catch (error) {
      setError(t('errors.network'));
    }
  };

  const deleteFeed = async (feedId: string) => {
    if (!confirm(tSettings('feeds.deleteConfirm'))) {
      return;
    }

    try {
      setDeleting(new Set(deleting).add(feedId));
      const res = await fetch(`/api/feeds/${feedId}`, {
        method: "DELETE"
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || t('errors.unknown'));
        return;
      }

      await fetchFeeds();
      setError("");
    } catch (error) {
      setError(t('errors.network'));
    } finally {
      setDeleting(prev => {
        const newSet = new Set(prev);
        newSet.delete(feedId);
        return newSet;
      });
    }
  };

  const refreshFeed = async (feedId: string) => {
    try {
      setRefreshing(prev => new Set(prev).add(feedId));
      const res = await fetch(`/api/feeds/${feedId}/refresh`, {
        method: "POST"
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || t('errors.unknown'));
        return;
      }

      await fetchFeeds();
      setError("");
    } catch (error) {
      setError(t('errors.network'));
    } finally {
      setRefreshing(prev => {
        const newSet = new Set(prev);
        newSet.delete(feedId);
        return newSet;
      });
    }
  };

  const handleSaveTags = (feedId: string) => {
    const tagArray = editingTags
      .split(/[,，]/)
      .map(t => t.trim())
      .filter(t => t.length > 0);
    if (tagArray.length > 0) {
      addTagsToFeed(feedId, tagArray);
    }
  };

  const openEdit = (feed: Feed) => {
    setEditingFeedId(feed.id);
    setEditingForm({
      tags: feed.tags.join(", "),
      defaultReadStatus: feed.defaultReadStatus,
      titleFilter: feed.titleFilter || ""
    });
  };

  const cancelEdit = () => {
    setEditingFeedId(null);
    setEditingForm({ tags: "", defaultReadStatus: false, titleFilter: "" });
  };

  const autoCategorizeFeed = async (feedId: string) => {
    if (!editingFeedId) return;

    try {
      setSaving(feedId);
      const res = await fetch(`/api/feeds/${feedId}/categorize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedId })
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || t('errors.unknown'));
        return;
      }

      const data = await res.json();
      if (data.feed && data.feed.tags) {
        setEditingForm({
          ...editingForm,
          tags: data.feed.tags.join(", ")
        });
        await fetchFeeds();
      }
      setError("");
    } catch (error) {
      setError(t('errors.network'));
    } finally {
      setSaving(null);
    }
  };

  const handleSaveEdit = () => {
    if (!editingFeedId) return;

    const tagArray = editingForm.tags
      .split(/[,，]/)
      .map(t => t.trim())
      .filter(t => t.length > 0);

    updateFeed(editingFeedId, tagArray, editingForm.defaultReadStatus, editingForm.titleFilter);
  };

  const toggleBatchEdit = () => {
    setBatchEditMode(!batchEditMode);
    setSelectedFeeds(new Set());
    setBatchTags("");
  };

  const toggleSelectFeed = (feedId: string) => {
    const newSelected = new Set(selectedFeeds);
    if (newSelected.has(feedId)) {
      newSelected.delete(feedId);
    } else {
      newSelected.add(feedId);
    }
    setSelectedFeeds(newSelected);
  };

  const selectAllFeeds = () => {
    if (selectedFeeds.size === feeds.length) {
      setSelectedFeeds(new Set());
    } else {
      setSelectedFeeds(new Set(feeds.map(f => f.id)));
    }
  };

  const handleBatchUpdateTags = async () => {
    if (selectedFeeds.size === 0) {
      setError(tSettings('feeds.selected', { count: 0 }));
      return;
    }

    const tagArray = batchTags
      .split(/[,，]/)
      .map(t => t.trim())
      .filter(t => t.length > 0);

    if (tagArray.length === 0) {
      setError(t('errors.required'));
      return;
    }

    try {
      setLoading(true);
      const feedIds = Array.from(selectedFeeds);

      for (const feedId of feedIds) {
        const res = await fetch(`/api/feeds/${feedId}/tags`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "add", tags: tagArray })
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || t('errors.unknown'));
          return;
        }
      }

      await fetchFeeds();
      setBatchEditMode(false);
      setSelectedFeeds(new Set());
      setBatchTags("");
      setError("");
    } catch (error) {
      setError(t('errors.network'));
    } finally {
      setLoading(false);
    }
  };

  const getAllTags = () => {
    const allTags = new Set<string>();
    feeds.forEach(feed => {
      if (feed.tags) {
        feed.tags.forEach(tag => allTags.add(tag));
      }
    });
    return Array.from(allTags).sort();
  };

  const addFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingFeed(true);
    setAddFeedError("");

    if (!newFeedUrl.trim()) {
      setAddFeedError(tSettings('feeds.addFeed.error.required'));
      setAddingFeed(false);
      return;
    }

    if (!newFeedUrl.startsWith('http://') && !newFeedUrl.startsWith('https://')) {
      setAddFeedError(tSettings('feeds.addFeed.error.invalidUrl'));
      setAddingFeed(false);
      return;
    }

    try {
      const tagArray = newFeedTags
        .split(/[,，]/)
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const res = await fetch("/api/feeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: newFeedUrl,
          titleFilter: newFeedTitleFilter || undefined,
          defaultReadStatus: newFeedDefaultReadStatus,
          tags: tagArray.length > 0 ? tagArray : undefined
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setAddFeedError(data.error || t('errors.unknown'));
        return;
      }

      // 清空表单
      setNewFeedUrl("");
      setNewFeedTitleFilter("");
      setNewFeedDefaultReadStatus(false);
      setNewFeedTags("");
      setShowAddFeed(false);
      await fetchFeeds();
    } catch (error) {
      setAddFeedError(t('errors.network'));
    } finally {
      setAddingFeed(false);
    }
  };

  const openAddFeed = () => {
    setShowAddFeed(true);
    setAddFeedError("");
    setNewFeedUrl("");
    setNewFeedTitleFilter("");
    setNewFeedDefaultReadStatus(false);
    setNewFeedTags("");
  };

  const closeAddFeed = () => {
    setShowAddFeed(false);
    setAddFeedError("");
    setNewFeedUrl("");
    setNewFeedTitleFilter("");
    setNewFeedDefaultReadStatus(false);
    setNewFeedTags("");
  };

  const exportFeeds = async () => {
    try {
      const res = await fetch("/api/feeds/opml/export");

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || t('errors.unknown'));
        return;
      }

      // 下载文件
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `feeds-${new Date().toISOString().split('T')[0]}.opml`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setError("");
    } catch (error) {
      setError(t('errors.network'));
    }
  };

  const importFeeds = async (file: File) => {
    setImporting(true);
    setImportError("");
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch("/api/feeds/opml/import", {
        method: "POST",
        body: formData
      });

      const data = await res.json();

      if (!res.ok) {
        setImportError(data.error || t('errors.unknown'));
        return;
      }

      setImportResult({
        imported: data.imported,
        failed: data.failed,
        skipped: data.skipped,
        details: data.details
      });

      await fetchFeeds();
      setShowImportModal(false);
    } catch (error) {
      setImportError(t('errors.network'));
    } finally {
      setImporting(false);
    }
  };

  const openImportModal = () => {
    setShowImportModal(true);
    setImportError("");
    setImportResult(null);
  };

  const closeImportModal = () => {
    setShowImportModal(false);
    setImportError("");
    setImportResult(null);
  };

  const fetchCleanupSettings = async () => {
    try {
      const res = await fetch("/api/settings/cleanup");
      const data = await res.json();
      if (res.ok) {
        setCleanupSettings(data);
      }
    } catch (error) {
      console.error("Failed to fetch cleanup settings:", error);
    }
  };

  const fetchCleanupStats = async () => {
    try {
      const res = await fetch("/api/items/cleanup");
      const data = await res.json();
      if (res.ok) {
        setCleanupStats({
          eligibleCount: data.eligibleCount || 0,
          message: data.message || ""
        });
      }
    } catch (error) {
      console.error("Failed to fetch cleanup stats:", error);
    }
  };

  const updateCleanupSettings = async () => {
    try {
      setCleanupLoading(true);
      const res = await fetch("/api/settings/cleanup", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemRetentionDays: cleanupSettings.itemRetentionDays,
          itemRetentionOnlyRead: cleanupSettings.itemRetentionOnlyRead
        })
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || t('errors.unknown'));
        return;
      }

      await fetchCleanupSettings();
      await fetchCleanupStats();
      setError("");
    } catch (error) {
      setError(t('errors.network'));
    } finally {
      setCleanupLoading(false);
    }
  };

  const executeCleanup = async () => {
    if (!confirm("确定要立即清理旧文章吗？此操作不可撤销。")) {
      return;
    }

    try {
      setExecutingCleanup(true);
      const res = await fetch("/api/items/cleanup", {
        method: "POST"
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || t('errors.unknown'));
        return;
      }

      const data = await res.json();
      alert(data.message);
      await fetchCleanupSettings();
      await fetchCleanupStats();
      await fetchFeeds();
      setError("");
    } catch (error) {
      setError(t('errors.network'));
    } finally {
      setExecutingCleanup(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">{t('common.loading')}</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const allTags = getAllTags();

  return (
    <div className="min-h-screen">
      <nav className="bg-theme-surface-transparent backdrop-blur-sm border-b border-theme px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-theme-primary">{t('nav.title')}</h1>
          <div className="flex items-center gap-4">
            <a
              href="/"
              className="text-sm text-theme-secondary hover:text-theme-primary font-medium transition-colors"
            >
              {t('nav.home')}
            </a>
            {["ADMIN", "SUPER_ADMIN"].includes(session.user?.role || '') && (
              <a
                href="/admin"
                className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium transition-colors"
              >
                {t('nav.admin')}
              </a>
            )}
            <UserMenu />
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-red-900 dark:text-red-300">{error}</p>
              <button
                onClick={() => setError("")}
                className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-theme-primary mb-2">
                {tSettings('title')}
              </h2>
              <p className="text-theme-secondary">
                {tSettings('description')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={openAddFeed}
                className="px-4 py-2 bg-accent hover:bg-opacity-80 text-white rounded-md text-sm font-medium transition-colors"
              >
                {tSettings('feeds.addFeed.button')}
              </button>
              <button
                onClick={exportFeeds}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium transition-colors"
              >
                导出 OPML
              </button>
              <button
                onClick={openImportModal}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
              >
                导入 OPML
              </button>
              {!batchEditMode ? (
                <button
                  onClick={toggleBatchEdit}
                  className="px-4 py-2 bg-theme-button-primary hover:bg-theme-button-primary-hover text-white rounded-md text-sm font-medium transition-colors"
                >
                  {tSettings('feeds.batchAddTags')}
                </button>
              ) : (
                <>
                  <button
                    onClick={toggleBatchEdit}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md text-sm font-medium transition-colors"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={selectAllFeeds}
                    className="px-4 py-2 bg-theme-button-primary hover:bg-theme-button-primary-hover text-white rounded-md text-sm font-medium transition-colors"
                  >
                    {selectedFeeds.size === feeds.length ? tSettings('feeds.cancelSelectAll') : tSettings('feeds.selectAll')}
                  </button>
                </>
              )}
            </div>
          </div>

          {showAddFeed && (
            <div className="mt-6 p-6 bg-accent/10 dark:bg-accent/20 border border-accent dark:border-accent/50 rounded-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-accent">
                  {tSettings('feeds.addFeed.title')}
                </h3>
                <button
                  onClick={closeAddFeed}
                  className="text-theme-secondary hover:text-theme-primary transition-colors"
                >
                  ✕
                </button>
              </div>

              {addFeedError && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                  <p className="text-sm text-red-800 dark:text-red-300">{addFeedError}</p>
                </div>
              )}

              <form onSubmit={addFeed} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-theme-primary mb-2">
                    {tSettings('feeds.addFeed.urlLabel')}
                  </label>
                  <input
                    type="url"
                    value={newFeedUrl}
                    onChange={(e) => setNewFeedUrl(e.target.value)}
                    placeholder={tSettings('feeds.addFeed.urlPlaceholder')}
                    className="w-full px-4 py-2 border border-theme rounded-md focus-ring bg-theme-input text-theme-text placeholder-theme-text-secondary"
                    disabled={addingFeed}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-theme-primary mb-2">
                      {tSettings('feeds.addFeed.tagsLabel')}
                    </label>
                    <input
                      type="text"
                      value={newFeedTags}
                      onChange={(e) => setNewFeedTags(e.target.value)}
                      placeholder={tSettings('feeds.addFeed.tagsPlaceholder')}
                      className="w-full px-4 py-2 border border-theme rounded-md focus-ring bg-theme-input text-theme-text placeholder-theme-text-secondary"
                      disabled={addingFeed}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-theme-primary mb-2">
                      {tSettings('feeds.addFeed.defaultStatusLabel')}
                    </label>
                    <select
                      value={newFeedDefaultReadStatus ? "read" : "unread"}
                      onChange={(e) => setNewFeedDefaultReadStatus(e.target.value === "read")}
                      className="w-full px-4 py-2 border border-theme rounded-md focus-ring bg-theme-input text-theme-text"
                      disabled={addingFeed}
                    >
                      <option value="unread">{tSettings('feeds.addFeed.statusUnread')}</option>
                      <option value="read">{tSettings('feeds.addFeed.statusRead')}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-theme-primary mb-2">
                    {tSettings('feeds.addFeed.titleFilterLabel')}
                  </label>
                  <input
                    type="text"
                    value={newFeedTitleFilter}
                    onChange={(e) => setNewFeedTitleFilter(e.target.value)}
                    placeholder={tSettings('feeds.addFeed.titleFilterPlaceholder')}
                    className="w-full px-4 py-2 border border-theme rounded-md focus-ring bg-theme-input text-theme-text placeholder-theme-text-secondary"
                    disabled={addingFeed}
                  />
                  <p className="mt-1 text-xs text-theme-secondary">
                    {tSettings('feeds.addFeed.titleFilterHelp')}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={addingFeed}
                    className="px-6 py-2 bg-accent hover:bg-opacity-80 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {addingFeed ? tSettings('feeds.addFeed.adding') : tSettings('feeds.addFeed.submit')}
                  </button>
                  <button
                    type="button"
                    onClick={closeAddFeed}
                    disabled={addingFeed}
                    className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </form>
            </div>
          )}

          {showImportModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-theme-surface rounded-lg shadow-xl max-w-lg w-full">
                <div className="border-b border-theme px-6 py-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-theme-primary">导入 OPML 文件</h2>
                  <button
                    onClick={closeImportModal}
                    className="text-theme-secondary hover:text-theme-primary transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  {importError && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md">
                      <p className="text-sm text-red-900 dark:text-red-200">{importError}</p>
                    </div>
                  )}

                  {importResult && (
                    <div className="p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-md">
                      <h4 className="text-sm font-semibold text-green-900 dark:text-green-200 mb-2">
                        导入完成
                      </h4>
                      <div className="space-y-1">
                        <p className="text-sm text-green-900 dark:text-green-200">
                          ✓ 成功导入: {importResult.imported} 个
                        </p>
                        <p className="text-sm text-green-900 dark:text-green-200">
                          ⊘ 跳过已存在: {importResult.skipped} 个
                        </p>
                        {importResult.failed > 0 && (
                          <p className="text-sm text-red-900 dark:text-red-200">
                            ✗ 失败: {importResult.failed} 个
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {!importResult && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-theme-primary mb-2">
                          选择文件
                        </label>
                        <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-theme rounded-lg hover:border-accent transition-colors">
                          <div className="space-y-2 text-center">
                            <svg
                              className="mx-auto h-12 w-12 text-theme-secondary"
                              stroke="currentColor"
                              fill="none"
                              viewBox="0 0 48 48"
                              aria-hidden="true"
                            >
                              <path
                                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                            <div className="flex text-sm text-theme-secondary">
                              <label
                                htmlFor="file-upload"
                                className="relative cursor-pointer bg-transparent rounded-md font-medium text-accent hover:text-accent/80 focus-within:outline-none"
                              >
                                <span>点击上传</span>
                                <input
                                  id="file-upload"
                                  type="file"
                                  accept=".opml,.xml"
                                  className="sr-only"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      importFeeds(file);
                                    }
                                  }}
                                  disabled={importing}
                                />
                              </label>
                              <p className="pl-1">或拖拽文件到此处</p>
                            </div>
                            <p className="text-xs text-theme-secondary">
                              支持 .opml 和 .xml 格式，最多 100 个订阅源
                            </p>
                          </div>
                        </div>
                      </div>

                      {importing && (
                        <div className="flex items-center justify-center py-4">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
                          <span className="ml-3 text-sm text-theme-secondary">正在导入...</span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="border-t border-theme px-6 py-4 flex justify-end">
                  <button
                    onClick={closeImportModal}
                    disabled={importing}
                    className="px-4 py-2 text-theme-primary bg-theme-surface hover:bg-theme-hover rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    关闭
                  </button>
                </div>
              </div>
            </div>
          )}

          {batchEditMode && (
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
                    {tSettings('feeds.batchTags')}
                  </label>
                  <input
                    type="text"
                    value={batchTags}
                    onChange={(e) => setBatchTags(e.target.value)}
                    placeholder={tSettings('feeds.batchTagsPlaceholder')}
                    className="w-full px-4 py-2 border border-theme rounded-md focus-ring bg-theme-input text-theme-text"
                  />
                </div>
                <button
                  onClick={handleBatchUpdateTags}
                  disabled={selectedFeeds.size === 0 || loading}
                  className="px-6 py-2 bg-theme-button-primary hover:bg-theme-button-primary-hover text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? t('common.save') : tSettings('feeds.applyTo', { count: selectedFeeds.size })}
                </button>
              </div>
              <p className="mt-2 text-xs text-blue-800 dark:text-blue-400">
                {tSettings('feeds.selected', { count: selectedFeeds.size })}
              </p>
            </div>
          )}

          <div className="bg-theme-surface rounded-lg shadow-theme border border-theme">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder={tSettings('feeds.searchPlaceholder')}
                  className="w-full px-4 py-2 border border-theme rounded-md focus-ring bg-theme-input text-theme-text placeholder-theme-text-secondary"
                />
              </div>
              <div className="text-sm text-theme-secondary">
                {tSettings('feeds.total', { count: feeds.length })}
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-theme-secondary">
                {t('common.loading')}
              </div>
            ) : feeds.length === 0 ? (
              <div className="py-12 text-center text-theme-secondary">
                <p className="mb-4">{tSettings('feeds.noFeeds')}</p>
                <a
                  href="/"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {tSettings('feeds.goToAdd')}
                </a>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {feeds.map((feed) => (
                  <div
                    key={feed.id}
                    className={`px-6 py-4 transition-colors ${
                      batchEditMode && selectedFeeds.has(feed.id)
                        ? "bg-blue-50 dark:bg-blue-900/30"
                        : "hover:bg-theme-hover"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {batchEditMode && (
                        <input
                          type="checkbox"
                          checked={selectedFeeds.has(feed.id)}
                          onChange={() => toggleSelectFeed(feed.id)}
                          className="mt-1 h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400 focus-ring cursor-pointer"
                        />
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-theme-primary mb-1">
                              {feed.title || "无标题"}
                            </h3>
                            <p className="text-sm text-theme-secondary mb-2 break-all">
                              {feed.url}
                            </p>
                            {editingFeedId === feed.id ? (
                              <div className="space-y-4 mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                                <div>
                                  <label className="block text-sm font-medium text-theme-primary mb-2">
                                    默认状态
                                  </label>
                                  <select
                                    value={editingForm.defaultReadStatus ? "read" : "unread"}
                                    onChange={(e) => setEditingForm({
                                      ...editingForm,
                                      defaultReadStatus: e.target.value === "read"
                                    })}
                                    className="w-full px-3 py-2 border border-theme rounded-md focus-ring bg-theme-input text-theme-text text-sm"
                                  >
                                    <option value="unread">未读</option>
                                    <option value="read">已读</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-theme-primary mb-2">
                                    标签（多个标签用逗号分隔）
                                  </label>
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      placeholder={tSettings('feeds.tagsPlaceholder')}
                                      value={editingForm.tags}
                                      onChange={(e) => setEditingForm({
                                        ...editingForm,
                                        tags: e.target.value
                                      })}
                                      className="flex-1 px-3 py-2 border border-theme rounded-md focus-ring bg-theme-input text-theme-text text-sm placeholder-theme-text-secondary"
                                    />
                                    <button
                                      onClick={() => autoCategorizeFeed(feed.id)}
                                      disabled={saving === feed.id}
                                      className="px-4 py-2 bg-theme-button-primary hover:bg-theme-button-primary-hover text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                      title="自动识别"
                                    >
                                      {saving === feed.id ? "识别中..." : "自动识别"}
                                    </button>
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-theme-primary mb-2">
                                    标题过滤器（正则表达式）
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="留空表示不过滤，匹配的标题将被过滤掉"
                                    value={editingForm.titleFilter}
                                    onChange={(e) => setEditingForm({
                                      ...editingForm,
                                      titleFilter: e.target.value
                                    })}
                                    className="w-full px-3 py-2 border border-theme rounded-md focus-ring bg-theme-input text-theme-text text-sm placeholder-theme-text-secondary"
                                  />
                                  <p className="mt-1 text-xs text-theme-secondary">
                                    匹配此正则表达式的标题将不会被添加到订阅源中
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-4">
                                <div className="flex flex-wrap gap-2">
                                  {feed.tags && feed.tags.length > 0 ? (
                                    feed.tags.map((tag) => (
                                      <span
                                        key={tag}
                                        onClick={() => removeTagFromFeed(feed.id, tag)}
                                        className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded cursor-pointer hover:bg-red-100 dark:hover:bg-red-900 hover:text-red-800 dark:hover:text-red-200 transition-colors"
                                        title={tSettings('feeds.clickToRemoveTag')}
                                      >
                                        {tag} ×
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-xs text-theme-muted">{tSettings('feeds.noTags')}</span>
                                  )}
                                </div>
                                {feed.titleFilter && (
                                  <span className="text-xs text-purple-600 dark:text-purple-400" title={`标题过滤器: ${feed.titleFilter}`}>
                                    🔧 已过滤
                                  </span>
                                )}
                                <span className="text-sm text-theme-secondary">
                                  默认状态: {feed.defaultReadStatus ? "已读" : "未读"}
                                </span>
                                <span className="text-sm text-theme-secondary">
                                  {feed._count.items} 篇文章
                                </span>
                                <span className="text-xs text-theme-muted">
                                  {new Date(feed.createdAt).toLocaleDateString('zh-CN')}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                            {editingFeedId === feed.id ? (
                              <>
                                <button
                                  onClick={handleSaveEdit}
                                  disabled={saving === feed.id}
                                  className="px-3 py-2 bg-theme-button-primary hover:bg-theme-button-primary-hover text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {saving === feed.id ? "保存中" : "保存"}
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md text-sm font-medium transition-colors"
                                >
                                  {t('common.cancel')}
                                </button>
                              </>
                            ) : editingTagsId === feed.id ? (
                              <>
                                <input
                                  type="text"
                                  placeholder={tSettings('feeds.tagsPlaceholder')}
                                  onChange={(e) => setEditingTags(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      handleSaveTags(feed.id);
                                    }
                                  }}
                                  className="w-48 px-3 py-2 border border-theme rounded-md focus-ring bg-theme-input text-theme-text text-sm placeholder-theme-text-secondary"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleSaveTags(feed.id)}
                                  disabled={saving === feed.id}
                                  className="px-3 py-2 bg-theme-button-primary hover:bg-theme-button-primary-hover text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {saving === feed.id ? "保存中" : "添加"}
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingTagsId(null);
                                    setEditingTags("");
                                  }}
                                  className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md text-sm font-medium transition-colors"
                                >
                                  {t('common.cancel')}
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => openEdit(feed)}
                                  className="p-2 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-md transition-colors"
                                  title="编辑"
                                  disabled={batchEditMode}
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingTagsId(feed.id);
                                    setEditingTags("");
                                  }}
                                  className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-md transition-colors"
                                  title={tSettings('feeds.addTags')}
                                  disabled={batchEditMode}
                                >
                                  +
                                </button>
                                <button
                                  onClick={() => refreshFeed(feed.id)}
                                  disabled={refreshing.has(feed.id)}
                                  className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  title={tSettings('feeds.refresh')}
                                >
                                  {refreshing.has(feed.id) ? "⟳" : "↻"}
                                </button>
                                <button
                                  onClick={() => deleteFeed(feed.id)}
                                  disabled={deleting.has(feed.id)}
                                  className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  title={tSettings('feeds.delete')}
                                >
                                  {deleting.has(feed.id) ? "..." : "🗑"}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-semibold text-theme-primary mb-4">
              {tSettings('feeds.allTags')}
            </h3>
            <div className="flex flex-wrap gap-2">
              {allTags.length === 0 ? (
                <span className="text-sm text-theme-secondary">{tSettings('feeds.noTags')}</span>
              ) : (
                allTags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 text-sm font-medium bg-theme-hover text-theme-primary rounded-full"
                  >
                    {tag}
                  </span>
                ))
              )}
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-2xl font-bold text-theme-primary mb-4">
              文章清理设置
            </h2>
            <div className="bg-theme-surface rounded-lg shadow-theme border border-theme p-6">
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-theme-primary">
                      自动清理旧文章
                    </label>
                    <select
                      value={cleanupSettings.itemRetentionDays}
                      onChange={(e) => setCleanupSettings({
                        ...cleanupSettings,
                        itemRetentionDays: parseInt(e.target.value)
                      })}
                      disabled={cleanupLoading}
                      className="px-4 py-2 border border-theme rounded-md focus-ring bg-theme-input text-theme-text"
                    >
                      <option value="-1">禁用</option>
                      <option value="7">7 天</option>
                      <option value="30">30 天</option>
                      <option value="60">60 天</option>
                      <option value="90">90 天</option>
                      <option value="180">180 天</option>
                      <option value="365">365 天</option>
                    </select>
                  </div>
                  <p className="text-xs text-theme-secondary">
                    自动删除超过指定天数的文章。设置为"禁用"则不自动清理。
                  </p>
                </div>

                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={cleanupSettings.itemRetentionOnlyRead}
                      onChange={(e) => setCleanupSettings({
                        ...cleanupSettings,
                        itemRetentionOnlyRead: e.target.checked
                      })}
                      disabled={cleanupLoading || cleanupSettings.itemRetentionDays === -1}
                      className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-accent focus:ring-accent cursor-pointer"
                    />
                    <span className="text-sm font-medium text-theme-primary">
                      仅清理已读文章
                    </span>
                  </label>
                  <p className="mt-1 text-xs text-theme-secondary">
                    开启后，只会删除已读的旧文章，未读文章将被保留。
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-theme-subtle">
                  <div>
                    <p className="text-sm font-medium text-theme-primary">
                      当前状态
                    </p>
                    <p className="text-xs text-theme-secondary mt-1">
                      {cleanupStats.eligibleCount > 0
                        ? `${cleanupStats.eligibleCount} 篇文章可被清理`
                        : "暂无可清理的文章"}
                      {cleanupSettings.lastItemCleanup && (
                        <span className="block mt-1">
                          上次清理: {new Date(cleanupSettings.lastItemCleanup).toLocaleString('zh-CN')}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={updateCleanupSettings}
                      disabled={cleanupLoading}
                      className="px-4 py-2 bg-accent hover:bg-opacity-80 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {cleanupLoading ? "保存中..." : "保存设置"}
                    </button>
                    <button
                      onClick={executeCleanup}
                      disabled={executingCleanup || cleanupSettings.itemRetentionDays === -1 || cleanupStats.eligibleCount === 0}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {executingCleanup ? "清理中..." : "立即清理"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
