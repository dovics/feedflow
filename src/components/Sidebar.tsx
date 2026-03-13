"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AddFeedForm } from "@/components/AddFeedForm";
import { TagFilter } from "@/components/TagFilter";
import { FeedList } from "@/components/FeedList";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Feed } from "@/types/feed";

type ReadStatusFilter = "all" | "read" | "unread";

interface SidebarProps {
  onFeedSelect: (feedId: string | null) => void;
  onTagSelect: (tag: string | null) => void;
  onItemsNeedRefresh: () => void;
  currentFilter?: ReadStatusFilter;
}

export function Sidebar({
  onFeedSelect,
  onTagSelect,
  onItemsNeedRefresh,
  currentFilter = "unread",
}: SidebarProps) {
  const tHome = useTranslations('home');

  // Sidebar internal state
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [newFeedUrl, setNewFeedUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [deletingFeed, setDeletingFeed] = useState<string | null>(null);
  const [feedsExpanded, setFeedsExpanded] = useState(true);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [selectedFeedId, setSelectedFeedId] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ feedId: string; feedTitle: string } | null>(null);

  // Use ref to track autoRefreshed without causing re-renders
  const autoRefreshedRef = useRef(false);

  // Memoized tag list
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    feeds.forEach(feed => {
      if (feed.tags) {
        feed.tags.forEach(tag => tags.add(tag));
      }
    });
    return Array.from(tags).sort();
  }, [feeds]);

  // Fetch feeds data
  const fetchFeeds = useCallback(async () => {
    try {
      const res = await fetch("/api/feeds");
      const data = await res.json();
      if (res.ok) {
        setFeeds(data.feeds);

        // Collapse feeds list if more than 10
        if (data.feeds.length > 10) {
          setFeedsExpanded(false);
        }

        // Auto-refresh all feeds once (background, non-blocking)
        if (!autoRefreshedRef.current && data.feeds.length > 0) {
          autoRefreshedRef.current = true;
          fetch("/api/feeds/refresh-all", { method: "POST" })
            .then(refreshRes => {
              if (refreshRes.ok) {
                console.log("Auto-refreshed all feeds in background");
              }
            })
            .catch(error => {
              console.error("Auto-refresh failed:", error);
            });
        }
      }
    } catch (error) {
      console.error("Failed to fetch feeds:", error);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchFeeds();
  }, [fetchFeeds]);

  // Add feed handler
  const handleAddFeed = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!newFeedUrl.trim()) {
      setError(tHome('addFeed.error.required'));
      setLoading(false);
      return;
    }

    if (!newFeedUrl.startsWith('http://') && !newFeedUrl.startsWith('https://')) {
      setError(tHome('addFeed.error.invalidUrl'));
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/feeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: newFeedUrl })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to add feed");
        return;
      }

      setNewFeedUrl("");
      await fetchFeeds();
      onItemsNeedRefresh();
    } catch (error) {
      setError(tHome('addFeed.error.networkError'));
    } finally {
      setLoading(false);
    }
  }, [newFeedUrl, fetchFeeds, onItemsNeedRefresh, tHome]);

  // Feed click handler
  const handleFeedClick = useCallback((feedId: string) => {
    setSelectedFeedId(feedId);
    setSelectedTag(null);
    onFeedSelect(feedId);
  }, [onFeedSelect]);

  // All feeds click handler
  const handleAllFeedsClick = useCallback(() => {
    setSelectedFeedId(null);
    setSelectedTag(null);
    onFeedSelect(null);
  }, [onFeedSelect]);

  // Tag click handler
  const handleTagClick = useCallback((tag: string | null) => {
    setSelectedFeedId(null);
    setSelectedTag(tag);
    onTagSelect(tag);
  }, [onTagSelect]);

  // Refresh feed handler
  const handleRefreshFeed = useCallback(async (feedId: string) => {
    setRefreshing(feedId);
    try {
      const res = await fetch(`/api/feeds/${feedId}/refresh`, {
        method: "POST"
      });

      if (res.ok) {
        await fetchFeeds();
        onItemsNeedRefresh();
      } else {
        const data = await res.json();
        setError(`${tHome('feeds.refreshing')}: ${data.error || tHome('errors.unknown')}`);
        setTimeout(() => setError(""), 5000);
      }
    } catch (error) {
      console.error("Failed to refresh feed:", error);
      setError(`${tHome('feeds.refresh')}: ${tHome('errors.network')}`);
      setTimeout(() => setError(""), 5000);
    } finally {
      setRefreshing(null);
    }
  }, [fetchFeeds, onItemsNeedRefresh, tHome]);

  // Delete feed handler - opens confirmation dialog
  const handleDeleteFeed = useCallback(async (feedId: string) => {
    const feedToDelete = feeds.find(f => f.id === feedId);
    setDeleteConfirm({ feedId, feedTitle: feedToDelete?.title || 'this feed' });
  }, [feeds]);

  // Confirm delete handler - executes the actual deletion
  const handleConfirmDelete = useCallback(async () => {
    if (!deleteConfirm) return;

    try {
      setDeletingFeed(deleteConfirm.feedId);
      const res = await fetch(`/api/feeds/${deleteConfirm.feedId}`, {
        method: "DELETE"
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || tHome('errors.unknown'));
        return;
      }

      if (selectedFeedId === deleteConfirm.feedId) {
        setSelectedFeedId(null);
        onFeedSelect(null);
      }

      await fetchFeeds();
      setError("");
    } catch (error) {
      setError(tHome('errors.network'));
    } finally {
      setDeletingFeed(null);
      setDeleteConfirm(null);
    }
  }, [deleteConfirm, selectedFeedId, fetchFeeds, onFeedSelect, tHome]);

  // Refresh all feeds handler
  const handleRefreshAllFeeds = useCallback(async () => {
    setRefreshingAll(true);
    try {
      const res = await fetch("/api/feeds/refresh-all", {
        method: "POST"
      });

      if (res.ok) {
        onItemsNeedRefresh();
      } else {
        setError("刷新订阅源失败");
        setTimeout(() => setError(""), 5000);
      }
    } catch (error) {
      console.error("Failed to refresh all feeds:", error);
      setError("刷新订阅源失败");
      setTimeout(() => setError(""), 5000);
    } finally {
      setRefreshingAll(false);
    }
  }, [onItemsNeedRefresh]);

  return (
    <div className="h-full overflow-y-auto lg:overflow-visible p-0">
      <AddFeedForm
        newFeedUrl={newFeedUrl}
        loading={loading}
        error={error}
        onAddFeed={handleAddFeed}
        onUrlChange={setNewFeedUrl}
      />

      <TagFilter
        tags={allTags}
        selectedTag={selectedTag}
        onTagClick={handleTagClick}
      />

      <div className="bg-theme-surface rounded-lg shadow-theme border border-theme p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setFeedsExpanded(!feedsExpanded)}
            className="flex items-center gap-2 text-lg font-semibold text-theme-primary hover:bg-theme-surface/50 rounded-md px-2 py-1 transition-colors focus-ring"
            aria-expanded={feedsExpanded}
            aria-controls="feeds-list"
          >
            <span>{tHome('feeds.title')}</span>
            <svg
              className={`w-5 h-5 transition-transform ${feedsExpanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <button
            onClick={handleRefreshAllFeeds}
            disabled={refreshingAll}
            className="px-3 py-1.5 text-sm text-accent hover:bg-accent/10 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 focus-ring"
            title="全部刷新"
            aria-busy={refreshingAll}
          >
            {refreshingAll ? (
              <>
                <svg
                  className="animate-spin w-4 h-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                刷新中…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                全部刷新
              </>
            )}
          </button>
        </div>

        {feedsExpanded && (
          <div className="mt-4 space-y-2" id="feeds-list">
            <button
              onClick={handleAllFeedsClick}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors focus-ring ${
                !selectedFeedId
                  ? "bg-accent/20 text-accent font-medium"
                  : "hover:bg-theme-surface text-theme-primary"
              }`}
              aria-pressed={!selectedFeedId}
            >
              {tHome('feeds.allFeeds')}
            </button>
            <FeedList
              feeds={feeds}
              selectedFeedId={selectedFeedId}
              refreshing={refreshing}
              deletingFeed={deletingFeed}
              onFeedClick={handleFeedClick}
              onRefreshFeed={handleRefreshFeed}
              onDeleteFeed={handleDeleteFeed}
            />
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={deleteConfirm !== null}
        title="取消订阅确认"
        message={`确定要取消订阅 "${deleteConfirm?.feedTitle}" 吗？此操作无法撤销。`}
        confirmLabel="取消订阅"
        cancelLabel="取消"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirm(null)}
        isDangerous={true}
      />
    </div>
  );
}
