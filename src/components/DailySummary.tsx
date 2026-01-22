"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import ReactMarkdown from "react-markdown";

interface DailySummaryData {
  id: string;
  date: string;
  content: string;
  language: string;
  itemCount: number;
  articleMap?: { [key: number]: string } | null;
}

interface DailySummaryProps {
  summary: DailySummaryData | null;
  loading: boolean;
  error?: string | null;
  onRefresh: () => void;
  onRegenerate?: () => void;
  streamingContent?: string;
  isStreaming?: boolean;
}

// Helper function to extract text content from ReactMarkdown children
function extractText(children: React.ReactNode): string {
  if (children === null || children === undefined) {
    return '';
  }
  if (typeof children === 'string') {
    return children;
  }
  if (typeof children === 'number') {
    return String(children);
  }
  if (Array.isArray(children)) {
    return children.map(extractText).join('');
  }
  if (typeof children === 'object') {
    // React element - try to get props.children
    const element = children as any;
    if (element.props && element.props.children !== undefined) {
      return extractText(element.props.children);
    }
  }
  return '';
}

// Helper function to render text with article references as links
function renderTextWithLinks(text: string, articleMap: { [key: number]: string } | null | undefined): React.ReactNode {
  if (!articleMap || !text.match(/\[\d+\]/g)) {
    return text;
  }

  const parts = text.split(/(\[\d+\])/g);
  return parts.map((part, index) => {
    const match = part.match(/\[(\d+)\]/);
    if (match) {
      const refNumber = parseInt(match[1]);
      const link = articleMap[refNumber];
      if (link) {
        return (
          <sup key={index} className="ml-0.5">
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:text-accent/80 hover:underline text-xs font-medium"
              title={`点击查看文章 ${refNumber}`}
            >
              [{refNumber}]
            </a>
          </sup>
        );
      }
    }
    return <span key={index}>{part}</span>;
  });
}

export function DailySummary({ summary, loading, error, onRefresh, onRegenerate, streamingContent, isStreaming }: DailySummaryProps) {
  const tSummary = useTranslations('summary');
  const [expanded, setExpanded] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);

  // Debug logging
  useEffect(() => {
    if (summary) {
      console.log("DailySummary - summary:", summary);
      console.log("DailySummary - articleMap:", summary.articleMap);
      console.log("DailySummary - content:", summary.content);

      // Show warning if articleMap is missing but content has references
      const hasReferences = summary.content && summary.content.match(/\[\d+\]/g);
      if (hasReferences && !summary.articleMap) {
        console.warn("⚠️ This summary contains article references but no articleMap. Please regenerate the summary to enable clickable links.");
      }
    }
  }, [summary]);

  // Auto-scroll to bottom when streaming
  useEffect(() => {
    if (isStreaming && contentRef.current && expanded) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [streamingContent, isStreaming, expanded]);

  // Show if there's a summary, loading, streaming, or there's an error
  if (!summary && !loading && !error && !streamingContent) {
    return null;
  }

  // Check if summary has references but no articleMap
  const hasReferences = summary?.content && summary.content.match(/\[\d+\]/g);
  const needsRegeneration = hasReferences && !summary?.articleMap;

  const summaryDate = summary ? new Date(summary.date) : new Date();
  const formattedDate = summaryDate.toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });

  return (
    <div className="bg-theme-surface backdrop-blur-sm rounded-lg shadow-theme border border-theme mb-6 overflow-hidden">
      <div className="px-6 py-4 border-b border-theme-subtle">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-accent/20 rounded-lg">
              <svg
                className="w-6 h-6 text-accent"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-theme-primary">
                {tSummary('title')}
              </h2>
              <p className="text-sm text-theme-secondary">
                {formattedDate}
                {summary && ` • ${tSummary('itemCount', { count: summary.itemCount })}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={summary ? onRegenerate : onRefresh}
              disabled={loading || isStreaming}
              className="px-4 py-2 text-sm font-medium text-accent hover:bg-accent/10 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              title={summary ? tSummary('regenerate') : tSummary('refresh')}
            >
              {(loading || isStreaming) ? (
                <>
                  <svg
                    className="animate-spin w-4 h-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  {tSummary('generating')}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {summary ? tSummary('regenerate') : tSummary('refresh')}
                </>
              )}
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className="px-3 py-2 text-theme-secondary hover:bg-theme-surface/50 rounded-md transition-colors"
              title={expanded ? "收起" : "展开"}
            >
              <svg
                className={`w-5 h-5 transition-transform ${expanded ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-6 py-4" ref={contentRef}>
          {needsRegeneration && (
            <div className="flex items-start gap-3 py-3 mb-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
              <svg
                className="w-6 h-6 text-amber-500 dark:text-amber-400 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="flex-1">
                <p className="text-amber-900 dark:text-amber-300 font-medium mb-1">
                  文章引用功能已升级
                </p>
                <p className="text-amber-800 dark:text-amber-400 text-sm">
                  此摘要包含文章引用，但缺少链接数据。请点击右上角"重新生成"按钮以启用可点击的文章链接。
                </p>
              </div>
            </div>
          )}
          {error && (
            <div className="flex items-start gap-3 py-4 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <svg
                className="w-6 h-6 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5"
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
                <p className="text-red-900 dark:text-red-300 font-medium mb-1">
                  {tSummary('generationError')}
                </p>
                <p className="text-red-800 dark:text-red-400 text-sm">{error}</p>
              </div>
            </div>
          )}
          {loading && !summary && !error && !isStreaming ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-3 text-theme-secondary">
                <svg
                  className="animate-spin h-5 w-5 text-accent"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span>{tSummary('generating')}</span>
              </div>
            </div>
          ) : (streamingContent || summary) ? (
            <div className="prose prose-blue dark:prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  h2: ({ node, ...props }) => (
                    <h2 className="text-lg font-bold text-theme-primary mt-4 mb-2 first:mt-0" {...props} />
                  ),
                  h3: ({ node, ...props }) => (
                    <h3 className="text-base font-semibold text-theme-primary mt-3 mb-2" {...props} />
                  ),
                  p: ({ node, children, ...props }) => {
                    const text = extractText(children);
                    const articleMap = summary?.articleMap;

                    return (
                      <p className="text-theme-primary my-2 leading-relaxed" {...props}>
                        {renderTextWithLinks(text, articleMap)}
                      </p>
                    );
                  },
                  ul: ({ node, ...props }) => (
                    <ul className="list-disc list-inside text-theme-primary my-2 space-y-1" {...props} />
                  ),
                  li: ({ node, children, ...props }) => {
                    const text = extractText(children);
                    const articleMap = summary?.articleMap;

                    return (
                      <li className="text-theme-primary" {...props}>
                        {renderTextWithLinks(text, articleMap)}
                      </li>
                    );
                  },
                  strong: ({ node, children, ...props }) => {
                    const text = extractText(children);
                    const articleMap = summary?.articleMap;

                    return (
                      <strong className="font-semibold text-theme-primary" {...props}>
                        {renderTextWithLinks(text, articleMap)}
                      </strong>
                    );
                  }
                }}
              >
                {streamingContent || summary?.content || ''}
              </ReactMarkdown>
              {isStreaming && (
                <span className="inline-block w-2 h-5 bg-accent ml-1 animate-pulse" />
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
