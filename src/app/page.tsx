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
  _count: {
    items: number;
  };
}

interface Item {
  id: string;
  title: string;
  link: string;
  description: string;
  pubDate: string;
  read: boolean;
  feed: {
    id: string;
    title: string;
  };
}

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const t = useTranslations();
  const tHome = useTranslations('home');
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [selectedFeedId, setSelectedFeedId] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [readStatusFilter, setReadStatusFilter] = useState<"all" | "read" | "unread">("unread");
  const [items, setItems] = useState<Item[]>([]);
  const [newFeedUrl, setNewFeedUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [deletingFeed, setDeletingFeed] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated") {
      fetchFeeds();
      fetchItems(undefined, undefined, readStatusFilter);
    }
  }, [status, router]);

  const fetchFeeds = async () => {
    try {
      const res = await fetch("/api/feeds");
      const data = await res.json();
      if (res.ok) {
        setFeeds(data.feeds);
      }
    } catch (error) {
      console.error("Failed to fetch feeds:", error);
    }
  };

  const fetchItems = async (
    feedId?: string | null,
    tag?: string | null,
    readStatus?: "all" | "read" | "unread"
  ) => {
    try {
      const params = new URLSearchParams();
      if (feedId) params.append("feedId", feedId);
      if (tag) params.append("tag", tag);
      if (readStatus && readStatus !== "all") {
        params.append("read", readStatus === "read" ? "true" : "false");
      }
      const url = `/api/items?${params.toString()}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setItems(data.items);
      }
    } catch (error) {
      console.error("Failed to fetch items:", error);
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
      await fetchItems(selectedFeedId, selectedTag, readStatusFilter);
    } catch (error) {
      setError(tHome('addFeed.error.networkError'));
    } finally {
      setLoading(false);
    }
  };

  const refreshFeed = async (feedId: string) => {
    setRefreshing(feedId);
    try {
      const res = await fetch(`/api/feeds/${feedId}/refresh`, {
        method: "POST"
      });

      if (res.ok) {
        await fetchFeeds();
        await fetchItems(selectedFeedId, selectedTag, readStatusFilter);
      } else {
        const data = await res.json();
        setError(`${tHome('feeds.refreshing')}: ${data.error || t('errors.unknown')}`);
        setTimeout(() => setError(""), 5000);
      }
    } catch (error) {
      console.error("Failed to refresh feed:", error);
      setError(`${tHome('feeds.refresh')}: ${t('errors.network')}`);
      setTimeout(() => setError(""), 5000);
    } finally {
      setRefreshing(null);
    }
  };

  const deleteFeed = async (feedId: string) => {
    if (!confirm(tHome('feeds.deleteConfirm') || "确定要取消订阅这个 RSS 源吗？")) {
      return;
    }

    try {
      setDeletingFeed(feedId);
      const res = await fetch(`/api/feeds/${feedId}`, {
        method: "DELETE"
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || t('errors.unknown'));
        return;
      }

      if (selectedFeedId === feedId) {
        setSelectedFeedId(null);
        fetchItems(undefined, selectedTag, readStatusFilter);
      }

      await fetchFeeds();
      setError("");
    } catch (error) {
      setError(t('errors.network'));
    } finally {
      setDeletingFeed(null);
    }
  };

  const handleFeedClick = (feedId: string) => {
    setSelectedFeedId(feedId);
    setSelectedTag(null);
    setReadStatusFilter("unread");
    fetchItems(feedId, null, "unread");
  };

  const handleAllFeedsClick = () => {
    setSelectedTag(null);
    setSelectedFeedId(null);
    setReadStatusFilter("unread");
    fetchItems(null, null, "unread");
  };

  const handleTagClick = (tag: string | null) => {
    setSelectedFeedId(null);
    setSelectedTag(tag);
    setReadStatusFilter("unread");
    fetchItems(undefined, tag, "unread");
  };

  const handleReadStatusFilterChange = (filter: "all" | "read" | "unread") => {
    setReadStatusFilter(filter);
    fetchItems(selectedFeedId, selectedTag, filter);
  };

  const markAsRead = async (itemId: string) => {
    try {
      await fetch(`/api/items/${itemId}/read`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true })
      });

      setItems(prevItems =>
        prevItems.map(item =>
          item.id === itemId ? { ...item, read: true } : item
        )
      );
    } catch (error) {
      console.error("Failed to mark item as read:", error);
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('nav.title')}</h1>
          <div className="flex items-center gap-4">
            <a
              href="/settings"
              className="text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium transition-colors"
            >
              {t('nav.settings')}
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
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{tHome('addFeed.title')}</h2>
              <form onSubmit={addFeed} className="space-y-3">
                <input
                  type="url"
                  placeholder={tHome('addFeed.placeholder')}
                  value={newFeedUrl}
                  onChange={(e) => setNewFeedUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md transition-colors disabled:opacity-50"
                >
                  {loading ? tHome('addFeed.adding') : tHome('addFeed.button')}
                </button>
              </form>

              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{tHome('addFeed.examples')}</p>
                <div className="space-y-2">
                  {[
                    { name: "Hacker News", url: "https://hnrss.org/frontpage" },
                    { name: "TechCrunch", url: "https://techcrunch.com/feed/" },
                    { name: "The Verge", url: "https://www.theverge.com/rss/index.xml" }
                  ].map((example) => (
                    <button
                      key={example.url}
                      onClick={() => setNewFeedUrl(example.url)}
                      className="w-full text-left px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                    >
                      {example.name}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                  <div className="flex items-start gap-2">
                    <svg
                      className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-900 dark:text-red-300">{t('errors.required')}</p>
                      <p className="text-sm text-red-800 dark:text-red-400 mt-1">{error}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mt-4">
              <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{tHome('feeds.title')}</h2>
              <div className="space-y-2">
                <button
                  onClick={handleAllFeedsClick}
                  className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                    !selectedFeedId
                      ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                      : "hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-200"
                  }`}
                >
                  {tHome('feeds.allFeeds')}
                </button>
                {feeds.map((feed) => (
                  <div key={feed.id} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleFeedClick(feed.id)}
                        className={`flex-1 text-left px-3 py-2 rounded-md transition-colors text-sm ${
                          selectedFeedId === feed.id
                            ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                            : "hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-200"
                        }`}
                      >
                        {feed.title}
                      </button>
                      <button
                        onClick={() => refreshFeed(feed.id)}
                        disabled={refreshing === feed.id}
                        className={`px-2 py-1 text-xs rounded transition-colors ${
                          refreshing === feed.id
                            ? "text-blue-400 dark:text-blue-500 cursor-not-allowed"
                            : "text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                        }`}
                        title={refreshing === feed.id ? tHome('feeds.refreshing') : tHome('feeds.refresh')}
                      >
                        {refreshing === feed.id ? "⟳" : "↻"}
                      </button>
                      <button
                        onClick={() => deleteFeed(feed.id)}
                        disabled={deletingFeed === feed.id}
                        className="px-2 py-1 text-xs rounded transition-colors text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-50"
                        title={tHome('feeds.unsubscribe')}
                      >
                        {deletingFeed === feed.id ? "..." : "✕"}
                      </button>
                    </div>
                    {feed.tags && feed.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 px-1">
                        {feed.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {feeds.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mt-4">
                <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{tHome('tags.title')}</h2>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleTagClick(null)}
                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                      selectedTag === null
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                    }`}
                  >
                    {tHome('tags.all')}
                  </button>
                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => handleTagClick(tag)}
                      className={`px-3 py-1 text-sm rounded-full transition-colors ${
                        selectedTag === tag
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  {selectedFeedId
                    ? feeds.find((f) => f.id === selectedFeedId)?.title ||
                      "Feed"
                    : tHome('items.title')}
                  {selectedTag && ` - ${selectedTag}`}
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleReadStatusFilterChange("all")}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                      readStatusFilter === "all"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                  >
                    {tHome('filter.all')}
                  </button>
                  <button
                    onClick={() => handleReadStatusFilterChange("unread")}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                      readStatusFilter === "unread"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                  >
                    {tHome('filter.unread')}
                  </button>
                  <button
                    onClick={() => handleReadStatusFilterChange("read")}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                      readStatusFilter === "read"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                  >
                    {tHome('filter.read')}
                  </button>
                </div>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {items.length === 0 ? (
                  <div className="px-6 py-12 text-center text-gray-600 dark:text-gray-400">
                    {tHome('items.noItems')}
                  </div>
                ) : (
                  items.map((item) => (
                    <div
                      key={item.id}
                      className={`px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                        item.read ? "opacity-60" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <a
                            href={`/reader/${item.id}`}
                            onClick={() => !item.read && markAsRead(item.id)}
                            className={`text-lg font-semibold hover:underline cursor-pointer ${
                              item.read
                                ? "text-gray-600 dark:text-gray-400"
                                : "text-blue-600 dark:text-blue-400"
                            }`}
                          >
                            {item.title}
                          </a>
                          <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            {item.feed.title} •{" "}
                            {new Date(item.pubDate).toLocaleDateString()}
                            {item.read && (
                              <span className="ml-2 text-xs text-gray-500 dark:text-gray-500">
                                {tHome('items.read')}
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <div className="mt-2 text-gray-800 dark:text-gray-300 line-clamp-3">
                              {item.description.replace(/<[^>]*>/g, "")}
                            </div>
                          )}
                        </div>
                        {!item.read && (
                          <button
                            onClick={() => markAsRead(item.id)}
                            className="px-3 py-1 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                            title={tHome('items.markAsRead')}
                          >
                            ✓
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
