"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { UserMenu } from "@/components/UserMenu";
import { DailySummary } from "@/components/DailySummary";
import { Sidebar } from "@/components/Sidebar";
import { FilterTabs } from "@/components/FilterTabs";
import { ItemList } from "@/components/ItemList";
import { Item } from "@/types/item";

type ReadStatusFilter = "all" | "read" | "unread";

interface DailySummaryData {
  id: string;
  date: string;
  content: string;
  language: string;
  itemCount: number;
  articleMap?: { [key: number]: string } | null;
}

export function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const t = useTranslations();
  const tHome = useTranslations('home');

  // Local state (only for items and filtering)
  const [selectedFeedId, setSelectedFeedId] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [readStatusFilter, setReadStatusFilter] = useState<ReadStatusFilter>("unread");
  const [items, setItems] = useState<Item[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  // Summary state
  const [summary, setSummary] = useState<DailySummaryData | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [markReadError, setMarkReadError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fetch items data
  const fetchItems = useCallback(async (
    feedId?: string | null,
    tag?: string | null,
    readStatus?: ReadStatusFilter,
    pageNum: number = 1,
    append: boolean = false
  ) => {
    try {
      const params = new URLSearchParams();
      if (feedId) params.append("feedId", feedId);
      if (tag) params.append("tag", tag);
      if (readStatus && readStatus !== "all") {
        params.append("read", readStatus === "read" ? "true" : "false");
      }
      params.append("page", pageNum.toString());
      params.append("limit", "20");

      const url = `/api/items?${params.toString()}`;
      const res = await fetch(url);
      const data = await res.json();

      if (res.ok) {
        const newItems = data.items || [];
        setItems(prevItems => {
          if (append) {
            const existingIds = new Set(prevItems.map(item => item.id));
            const uniqueNewItems = newItems.filter((item: Item) => !existingIds.has(item.id));
            return [...prevItems, ...uniqueNewItems];
          } else {
            return newItems;
          }
        });
        setHasMore(newItems.length === 20);
        setPage(pageNum);
      }
    } catch (error) {
      console.error("Failed to fetch items:", error);
    }
  }, []);

  // Infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;

      if (scrollTop + windowHeight >= docHeight - 200 && hasMore && !loadingMore) {
        loadMoreItems();
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasMore, loadingMore, selectedFeedId, selectedTag, readStatusFilter]);

  const loadMoreItems = useCallback(async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    const nextPage = page + 1;
    await fetchItems(selectedFeedId, selectedTag, readStatusFilter, nextPage, true);
    setLoadingMore(false);
  }, [loadingMore, hasMore, page, selectedFeedId, selectedTag, readStatusFilter, fetchItems]);

  // Handle selection changes from Sidebar
  const handleFeedSelect = useCallback((feedId: string | null) => {
    setSelectedFeedId(feedId);
    setSelectedTag(null);
    setItems([]);
    setPage(1);
    fetchItems(feedId, null, readStatusFilter, 1, false);
    setSidebarOpen(false);
  }, [fetchItems, readStatusFilter]);

  const handleTagSelect = useCallback((tag: string | null) => {
    setSelectedFeedId(null);
    setSelectedTag(tag);
    setItems([]);
    setPage(1);
    fetchItems(null, tag, readStatusFilter, 1, false);
    setSidebarOpen(false);
  }, [fetchItems, readStatusFilter]);

  const handleReadStatusFilterChange = useCallback((filter: ReadStatusFilter) => {
    setReadStatusFilter(filter);
    setItems([]);
    setPage(1);
    fetchItems(selectedFeedId, selectedTag, filter, 1, false);
  }, [fetchItems, selectedFeedId, selectedTag]);

  const handleItemClick = useCallback((itemId: string) => {
    // Clean up old item cache (keep last 10)
    const itemKeys = Object.keys(sessionStorage)
      .filter(key => key.startsWith('feedwise_item_'))
      .sort();

    if (itemKeys.length > 10) {
      itemKeys.slice(0, itemKeys.length - 10).forEach(key => {
        sessionStorage.removeItem(key);
      });
    }

    // Save current state
    const stateToSave = {
      feedId: selectedFeedId,
      tag: selectedTag,
      readStatus: readStatusFilter,
      scrollPosition: window.scrollY,
      items: items,
    };
    sessionStorage.setItem('feedwise_home_state', JSON.stringify(stateToSave));

    // Cache item data for reader page
    const item = items.find(i => i.id === itemId);
    if (item) {
      sessionStorage.setItem(`feedwise_item_${itemId}`, JSON.stringify(item));
    }
  }, [selectedFeedId, selectedTag, readStatusFilter, items]);

  const generateSummary = useCallback(async (force: boolean = false) => {
    setSummaryLoading(true);
    setSummaryError(null);
    setStreamingContent('');
    setIsStreaming(true);

    try {
      const response = await fetch("/api/summaries/stream", {
        method: "POST"
      });

      if (!response.ok) {
        throw new Error('Stream request failed');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      if (!reader) {
        throw new Error('No reader available');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);

              if (parsed.type === 'error') {
                setSummaryError(parsed.data);
                setIsStreaming(false);
                setSummaryLoading(false);
                return;
              } else if (parsed.type === 'token') {
                fullContent += parsed.data;
                setStreamingContent(fullContent);
              } else if (parsed.type === 'done') {
                console.log("Stream done received - parsed:", parsed);
                console.log("Stream done received - articleMap:", parsed.articleMap);
                const saveRes = await fetch("/api/summaries/save", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ force, content: fullContent, itemCount: parsed.itemCount, articleMap: parsed.articleMap })
                });
                const saveData = await saveRes.json();
                if (saveData.summary) {
                  setSummary(saveData.summary);
                }
                setIsStreaming(false);
                setStreamingContent('');
                setSummaryLoading(false);
                return;
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error("Failed to stream summary:", error);
      setSummaryError("网络错误，请稍后重试");
      setIsStreaming(false);
      setStreamingContent('');
      setSummaryLoading(false);
    }
  }, []);

  // Initialization
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated") {
      // Clean up expired item cache (older than 1 hour)
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      Object.keys(sessionStorage)
        .filter(key => key.startsWith('feedwise_item_'))
        .forEach(key => {
          try {
            const item = JSON.parse(sessionStorage.getItem(key) || '');
            if (item.pubDate && new Date(item.pubDate).getTime() < oneHourAgo) {
              sessionStorage.removeItem(key);
            }
          } catch {
            sessionStorage.removeItem(key);
          }
        });

      // Check/generate today's summary
      fetch("/api/summaries/generate", { method: "POST" })
        .then(res => res.json())
        .then(data => {
          if (data.summary) {
            console.log("Summary loaded:", data.summary);
            console.log("Article map:", data.summary.articleMap);
            setSummary(data.summary);
            setSummaryError(null);
          } else if (data.error) {
            setSummaryError(data.error);
          }
        })
        .catch(error => {
          console.error("Failed to check summary:", error);
        });

      // Restore saved state if available
      const savedState = sessionStorage.getItem('feedwise_home_state');
      if (savedState) {
        try {
          const saved = JSON.parse(savedState);
          setSelectedFeedId(saved.feedId);
          setSelectedTag(saved.tag);
          setReadStatusFilter(saved.readStatus);
          setItems(saved.items || []);
          setPage(1);
          setHasMore(true);
          sessionStorage.removeItem('feedflow_home_state');

          setTimeout(() => {
            window.scrollTo(0, saved.scrollPosition || 0);
          }, 100);
        } catch (error) {
          console.error('Failed to restore state:', error);
          fetchItems(undefined, undefined, readStatusFilter, 1, false);
        }
      } else {
        fetchItems(undefined, undefined, readStatusFilter, 1, false);
      }
    }
  }, [status, router, fetchItems]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center" role="status" aria-live="polite">
        <div className="text-gray-600">{t('common.loading')}</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const itemsTitle = selectedFeedId
    ? "Feed"
    : tHome('items.title');

  return (
    <div className="min-h-screen flex flex-col bg-theme-background">
      {/* Skip link for accessibility */}
      <a href="#main-content" className="skip-link focus-ring">
        跳转到主内容
      </a>

      {/* Navigation */}
      <nav
        className="sticky top-0 z-50 bg-theme-surface-transparent backdrop-blur-sm border-b border-theme px-6 py-4"
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="max-w-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-md hover:bg-theme-surface/50 text-theme-primary transition-colors focus-ring"
              aria-label={sidebarOpen ? "关闭侧边栏" : "打开侧边栏"}
              aria-expanded={sidebarOpen}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-theme-primary text-wrap-balance">
              {t('nav.title')}
            </h1>
          </div>
          <UserMenu />
        </div>
      </nav>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main layout */}
      <div className="flex flex-1 relative">
        {/* Sidebar */}
        <aside
          className={`fixed lg:fixed inset-y-0 left-0 z-40 w-80 max-w-[85vw] transform transition-transform duration-300 ease-in-out ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
          role="complementary"
          aria-label="Sidebar"
        >
          <div className="h-full overflow-y-auto bg-theme-surface lg:bg-transparent p-4 pt-[calc(73px+16px)] lg:p-0 lg:pt-4">
            <div className="lg:sticky lg:top-[73px] lg:h-[calc(100vh-73px)] lg:overflow-y-auto lg:p-6 lg:border-r lg:border-theme lg:bg-theme-surface/50">
              <Sidebar
                onFeedSelect={handleFeedSelect}
                onTagSelect={handleTagSelect}
                onItemsNeedRefresh={() => fetchItems(selectedFeedId, selectedTag, readStatusFilter, 1, false)}
              />
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main
          id="main-content"
          className="flex-1 lg:ml-80 min-w-0"
          tabIndex={-1}
        >
          <div className="max-w-5xl mx-auto px-6 py-8">
            <DailySummary
              summary={summary}
              loading={summaryLoading}
              error={summaryError}
              onRefresh={() => generateSummary(false)}
              onRegenerate={() => generateSummary(true)}
              streamingContent={streamingContent}
              isStreaming={isStreaming}
            />

            <div className="bg-theme-surface rounded-lg shadow-theme border border-theme">
              <div className="px-6 py-4 border-b border-theme-subtle">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-semibold text-theme-primary text-wrap-balance">
                    {itemsTitle}
                    {selectedTag && ` — ${selectedTag}`}
                  </h2>
                  {items.some(item => !item.read) && (
                    <button
                      onClick={() => {
                        setMarkingAllRead(true);
                        const body: any = {};
                        if (selectedFeedId) body.feedId = selectedFeedId;
                        if (selectedTag) body.tag = selectedTag;

                        fetch("/api/items/mark-all-read", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(body)
                        })
                          .then(res => {
                            if (res.ok) {
                              setItems(prevItems =>
                                prevItems.map(item => {
                                  if (selectedFeedId && item.feed.id !== selectedFeedId) {
                                    return item;
                                  }
                                  if (selectedTag && !item.feed.tags?.includes(selectedTag)) {
                                    return item;
                                  }
                                  return item.read ? item : { ...item, read: true };
                                })
                              );
                            } else {
                              return res.json();
                            }
                          })
                          .then(data => {
                            if (data && data.error) {
                              setMarkReadError(data.error || "批量标记已读失败");
                              setTimeout(() => setMarkReadError(null), 5000);
                            }
                          })
                          .catch(() => {
                            setMarkReadError("批量标记已读失败");
                            setTimeout(() => setMarkReadError(null), 5000);
                          })
                          .finally(() => {
                            setMarkingAllRead(false);
                          });
                      }}
                      disabled={markingAllRead}
                      className="px-3 py-1.5 text-sm font-medium text-accent hover:bg-accent/10 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-ring"
                      aria-busy={markingAllRead}
                    >
                      {markingAllRead ? "标记中…" : "全部已读"}
                    </button>
                  )}
                </div>
                <FilterTabs
                  currentFilter={readStatusFilter}
                  onFilterChange={handleReadStatusFilterChange}
                />
              </div>

              {markReadError && (
                <div
                  className="fixed bottom-4 right-4 z-50 max-w-md"
                  role="alert"
                  aria-live="assertive"
                >
                  <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md shadow-lg flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm text-red-700 dark:text-red-300 truncate">
                        {markReadError}
                      </span>
                    </div>
                    <button
                      onClick={() => setMarkReadError(null)}
                      className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 flex-shrink-0 focus-ring p-1"
                      aria-label="关闭错误提示"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              <ItemList
                items={items}
                selectedFeedId={selectedFeedId}
                feeds={[]}
                onItemClick={handleItemClick}
                onMarkAsRead={async (itemId) => {
                  try {
                    setMarkReadError(null);
                    const res = await fetch(`/api/items/${itemId}/read`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ read: true })
                    });

                    if (!res.ok) {
                      const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
                      const errorMessage = errorData.error || res.statusText;

                      if (res.status === 404) {
                        setItems(prevItems => prevItems.filter(item => item.id !== itemId));
                        setMarkReadError(tHome('items.errorNotFound') || "Article not found - removed from list");
                        setTimeout(() => setMarkReadError(null), 3000);
                      } else {
                        setMarkReadError(`${tHome('items.markAsReadError') || "Failed to mark as read"}: ${errorMessage}`);
                        setTimeout(() => setMarkReadError(null), 3000);
                      }
                      console.error("Failed to mark item as read:", errorMessage);
                      return;
                    }

                    setItems(prevItems =>
                      prevItems.map(item =>
                        item.id === itemId ? { ...item, read: true } : item
                      )
                    );
                  } catch (error) {
                    console.error("Failed to mark item as read:", error);
                    setMarkReadError(tHome('items.networkError') || "Network error. Please try again.");
                    setTimeout(() => setMarkReadError(null), 3000);
                  }
                }}
                loadingMore={loadingMore}
                hasMore={hasMore}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
