import { ReadingSettings } from "@/types/reader";

interface ReaderContentProps {
  title: string;
  description: string;
  link: string;
  feedTitle: string;
  pubDate: string;
  settings: ReadingSettings;
}

export function ReaderContent({
  title,
  description,
  link,
  feedTitle,
  pubDate,
  settings
}: ReaderContentProps) {
  const processedDescription = description
    .replace(/<[^>]*>/g, "")
    .trim();

  return (
    <article
      className="max-w-4xl mx-auto py-8 px-6 min-h-screen transition-colors duration-200"
      style={{
        backgroundColor: settings.backgroundColor,
        color: settings.textColor
      }}
    >
      <header className="mb-8">
        <div className="text-sm opacity-70 mb-2" style={{ fontFamily: settings.fontFamily }}>
          {feedTitle}
        </div>
        <time className="text-sm opacity-70 mb-4 block" style={{ fontFamily: settings.fontFamily }}>
          {new Date(pubDate).toLocaleString("zh-CN", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
          })}
        </time>
        <h1
          className="font-bold mb-4"
          style={{
            fontSize: `${settings.fontSize * 1.5}px`,
            lineHeight: settings.lineHeight,
            fontFamily: settings.fontFamily
          }}
        >
          {title}
        </h1>
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-sm opacity-70 hover:opacity-100 transition-opacity underline"
          style={{ fontFamily: settings.fontFamily }}
        >
          在原网站查看 →
        </a>
      </header>

      <div
        className="prose max-w-none"
        style={{
          fontSize: `${settings.fontSize}px`,
          lineHeight: settings.lineHeight,
          fontFamily: settings.fontFamily
        }}
      >
        {processedDescription.split("\n").map((paragraph, index) => (
          <p
            key={index}
            className="mb-4 last:mb-0"
            style={{ fontSize: `${settings.fontSize}px`, lineHeight: settings.lineHeight }}
          >
            {paragraph}
          </p>
        ))}
      </div>

      <footer className="mt-12 pt-6 border-t border-current opacity-50">
        <div className="text-sm" style={{ fontFamily: settings.fontFamily }}>
          来自: {feedTitle}
        </div>
        <div className="text-sm" style={{ fontFamily: settings.fontFamily }}>
          发布时间: {new Date(pubDate).toLocaleString("zh-CN")}
        </div>
      </footer>
    </article>
  );
}
