"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";

type SearchScope = "all" | "title" | "description";

interface SearchBoxProps {
  onSearch: (query: string, scope: SearchScope) => void;
  placeholder?: string;
  className?: string;
}

export function SearchBox({
  onSearch,
  placeholder,
  className = ""
}: SearchBoxProps) {
  const t = useTranslations('home');
  const [query, setQuery] = useState("");
  const [searchScope, setSearchScope] = useState<SearchScope>("all");
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Debounced search
  const debouncedSearch = useCallback((searchQuery: string, scope: SearchScope) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      onSearch(searchQuery, scope);
      setIsSearching(false);
    }, 300);
  }, [onSearch]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    setIsSearching(true);
    debouncedSearch(newQuery, searchScope);
  }, [debouncedSearch, searchScope]);

  const handleScopeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newScope = e.target.value as SearchScope;
    setSearchScope(newScope);
    if (query) {
      setIsSearching(true);
      debouncedSearch(query, newScope);
    }
  }, [query, debouncedSearch]);

  const handleClear = useCallback(() => {
    setQuery("");
    onSearch("", searchScope);
    inputRef.current?.focus();
  }, [onSearch, searchScope]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      handleClear();
    }
  }, [handleClear]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="h-5 w-5 text-theme-secondary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || t('search.placeholder') || "搜索..."}
            className="block w-full pl-10 pr-10 py-2 border border-theme-subtle rounded-md leading-5 bg-theme-background placeholder-theme-secondary text-theme-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent sm:text-sm transition-colors"
            aria-label="搜索文章"
            aria-busy={isSearching}
          />
          {query && (
            <button
              onClick={handleClear}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-theme-secondary hover:text-theme-primary transition-colors focus-ring rounded-md"
              aria-label="清除搜索"
              type="button"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
        <select
          value={searchScope}
          onChange={handleScopeChange}
          className="px-3 py-2 border border-theme-subtle rounded-md bg-theme-background text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
          aria-label="搜索范围"
        >
          <option value="all">{t('search.scope.all') || '全部'}</option>
          <option value="title">{t('search.scope.title') || '标题'}</option>
          <option value="description">{t('search.scope.description') || '摘要'}</option>
        </select>
      </div>
      {isSearching && (
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <svg
            className="animate-spin h-5 w-5 text-accent"
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
        </div>
      )}
    </div>
  );
}
