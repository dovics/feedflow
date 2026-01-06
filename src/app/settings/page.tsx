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

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated") {
      fetchFeeds();
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('nav.title')}</h1>
          <div className="flex items-center gap-4">
            <a
              href="/"
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-medium transition-colors"
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
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {tSettings('title')}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {tSettings('description')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {!batchEditMode ? (
                <button
                  onClick={toggleBatchEdit}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
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
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
                  >
                    {selectedFeeds.size === feeds.length ? tSettings('feeds.cancelSelectAll') : tSettings('feeds.selectAll')}
                  </button>
                </>
              )}
            </div>
          </div>

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
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                <button
                  onClick={handleBatchUpdateTags}
                  disabled={selectedFeeds.size === 0 || loading}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? t('common.save') : tSettings('feeds.applyTo', { count: selectedFeeds.size })}
                </button>
              </div>
              <p className="mt-2 text-xs text-blue-800 dark:text-blue-400">
                {tSettings('feeds.selected', { count: selectedFeeds.size })}
              </p>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder={tSettings('feeds.searchPlaceholder')}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {tSettings('feeds.total', { count: feeds.length })}
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-gray-600 dark:text-gray-400">
                {t('common.loading')}
              </div>
            ) : feeds.length === 0 ? (
              <div className="py-12 text-center text-gray-600 dark:text-gray-400">
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
                        : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {batchEditMode && (
                        <input
                          type="checkbox"
                          checked={selectedFeeds.has(feed.id)}
                          onChange={() => toggleSelectFeed(feed.id)}
                          className="mt-1 h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        />
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                              {feed.title || "无标题"}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 break-all">
                              {feed.url}
                            </p>
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
                                  <span className="text-xs text-gray-400 dark:text-gray-500">{tSettings('feeds.noTags')}</span>
                                )}
                              </div>
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                {feed._count.items} 篇文章
                              </span>
                              <span className="text-xs text-gray-400 dark:text-gray-500">
                                {new Date(feed.createdAt).toLocaleDateString('zh-CN')}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                            {editingTagsId === feed.id ? (
                              <>
                                <input
                                  type="text"
                                  placeholder={tSettings('feeds.tagsPlaceholder')}
                                  onChange={(e) => setEditingTags(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      handleSaveTags(feed.id);
                                    } else if (e.key === "Escape") {
                                      setEditingTagsId(null);
                                      setEditingTags("");
                                    }
                                  }}
                                  onBlur={() => {
                                    if (editingTagsId === feed.id) {
                                      handleSaveTags(feed.id);
                                    }
                                  }}
                                  className="w-48 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleSaveTags(feed.id)}
                                  disabled={saving === feed.id}
                                  className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {saving === feed.id ? "保存中" : "添加"}
                                </button>
                              </>
                            ) : (
                              <>
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
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {tSettings('feeds.allTags')}
            </h3>
            <div className="flex flex-wrap gap-2">
              {allTags.length === 0 ? (
                <span className="text-sm text-gray-500 dark:text-gray-400">{tSettings('feeds.noTags')}</span>
              ) : (
                allTags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 text-sm font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full"
                  >
                    {tag}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
