import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  let userId: string | undefined;

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      logger.logApiRequestError('GET', '/api/feeds/opml/export', new Error('Unauthorized'), undefined, Date.now() - startTime);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    userId = session.user.id;
    logger.logApiRequestStart('GET', '/api/feeds/opml/export', userId);

    const feeds = await prisma.feed.findMany({
      where: {
        userId: session.user.id
      },
      orderBy: {
        title: "asc"
      }
    });

    logger.logDatabaseOperation('read', 'Feed', { userId, feedCount: feeds.length });

    // 生成 OPML XML (过滤掉 title 为 null 的 feeds)
    const feedsForOPML = feeds
      .filter(feed => feed.title !== null)
      .map(feed => ({
        url: feed.url,
        title: feed.title as string,
        tags: feed.tags || []
      }));

    const opmlContent = generateOPML(feedsForOPML);

    // 设置响应头，触发文件下载
    const headers = new Headers();
    headers.set('Content-Type', 'application/xml');
    headers.set('Content-Disposition', `attachment; filename="feeds-${new Date().toISOString().split('T')[0]}.opml"`);

    logger.logApiRequestSuccess('GET', '/api/feeds/opml/export', userId, Date.now() - startTime, { feedCount: feeds.length });
    return new NextResponse(opmlContent, { headers });
  } catch (error) {
    logger.logApiRequestError('GET', '/api/feeds/opml/export', error as Error, userId, Date.now() - startTime);
    return NextResponse.json(
      { error: "导出失败：" + (error instanceof Error ? error.message : "未知错误") },
      { status: 500 }
    );
  }
}

function generateOPML(feeds: Array<{ url: string; title: string; tags: string[] }>): string {
  const currentDate = new Date().toISOString();

  let opml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>FeedWise Subscriptions</title>
    <dateCreated>${currentDate}</dateCreated>
    <dateModified>${currentDate}</dateModified>
  </head>
  <body>
`;

  // 按 tags 分组 feeds
  const tagGroups = new Map<string, Array<typeof feeds[0]>>();
  const untaggedFeeds: Array<typeof feeds[0]> = [];

  feeds.forEach(feed => {
    if (feed.tags && feed.tags.length > 0) {
      feed.tags.forEach(tag => {
        if (!tagGroups.has(tag)) {
          tagGroups.set(tag, []);
        }
        tagGroups.get(tag)!.push(feed);
      });
    } else {
      untaggedFeeds.push(feed);
    }
  });

  // 生成带 tag 的 feeds
  tagGroups.forEach((groupFeeds, tag) => {
    opml += `    <outline text="${escapeXML(tag)}" title="${escapeXML(tag)}">\n`;
    groupFeeds.forEach(feed => {
      opml += `      <outline type="rss" text="${escapeXML(feed.title)}" title="${escapeXML(feed.title)}" xmlUrl="${escapeXML(feed.url)}" htmlUrl="${escapeXML(feed.url)}"/>\n`;
    });
    opml += `    </outline>\n`;
  });

  // 生成不带 tag 的 feeds
  untaggedFeeds.forEach(feed => {
    opml += `    <outline type="rss" text="${escapeXML(feed.title)}" title="${escapeXML(feed.title)}" xmlUrl="${escapeXML(feed.url)}" htmlUrl="${escapeXML(feed.url)}"/>\n`;
  });

  opml += `  </body>
</opml>`;

  return opml;
}

function escapeXML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
