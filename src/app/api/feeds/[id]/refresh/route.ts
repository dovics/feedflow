import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Parser from "rss-parser";
import { logger } from "@/lib/logger";

const parser = new Parser({
  timeout: 15000,
  maxRedirects: 5
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  let userId: string | undefined;
  const { id } = await params;

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      logger.logApiRequestError('POST', `/api/feeds/${id}/refresh`, new Error('Unauthorized'), undefined, Date.now() - startTime);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    userId = session.user.id;
    logger.logApiRequestStart('POST', `/api/feeds/${id}/refresh`, userId);

    const feed = await prisma.feed.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!feed || feed.userId !== session.user.id) {
      logger.warn('Feed not found for refresh', { userId, feedId: id });
      return NextResponse.json({ error: "Feed not found" }, { status: 404 });
    }

    let parsedFeed;
    try {
      logger.info('Refreshing RSS feed', { userId, feedId: id, url: feed.url });
      parsedFeed = await parser.parseURL(feed.url);
      logger.info('RSS feed refreshed successfully', { userId, feedId: id, itemCount: parsedFeed.items.length });
    } catch (parseError) {
      logger.logApiRequestError('POST', `/api/feeds/${id}/refresh`, parseError as Error, userId, Date.now() - startTime, { phase: 'rss_parse' });

      if (parseError instanceof Error) {
        if (parseError.message.includes('ETIMEDOUT') || parseError.message.includes('timeout')) {
          return NextResponse.json(
            { error: "连接超时：无法更新 RSS 源，请检查网络连接或稍后重试" },
            { status: 408 }
          );
        }
        if (parseError.message.includes('ENOTFOUND') || parseError.message.includes('getaddrinfo')) {
          return NextResponse.json(
            { error: "域名解析失败：无效的 URL 或网络不可达" },
            { status: 400 }
          );
        }
      }

      return NextResponse.json(
        { error: "无法解析 RSS 源：" + (parseError instanceof Error ? parseError.message : "未知错误") },
        { status: 400 }
      );
    }

    let newItemsCount = 0;
    let filteredItemsCount = 0;

    for (const item of parsedFeed.items) {
      const existingItem = await prisma.item.findFirst({
        where: {
          feedId: id,
          link: item.link
        }
      });

      if (!existingItem && item.title) {
        // 如果订阅源设置了标题过滤器，检查是否应该跳过此项目
        if (feed.titleFilter) {
          try {
            const regex = new RegExp(feed.titleFilter, 'i');
            if (regex.test(item.title)) {
              // 标题匹配过滤器，跳过此项目
              filteredItemsCount++;
              continue;
            }
          } catch (error) {
            logger.warn('Invalid regex filter during refresh', { userId, feedId: id, titleFilter: feed.titleFilter }, error as Error);
            // 如果正则表达式无效，继续添加项目
          }
        }

        await prisma.item.create({
          data: {
            title: item.title,
            link: item.link,
            description: item.contentSnippet || item.content || item.description,
            pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
            feedId: id,
            read: feed.defaultReadStatus
          }
        });
        newItemsCount++;
      }
    }

    if (newItemsCount > 0 || filteredItemsCount > 0) {
      logger.info('Feed refresh completed', { userId, feedId: id, newItemsCount, filteredItemsCount });
    }

    const updatedFeed = await prisma.feed.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: {
            createdAt: "desc"
          },
          take: 20
        }
      }
    });

    logger.logApiRequestSuccess('POST', `/api/feeds/${id}/refresh`, userId, Date.now() - startTime, { newItemsCount, totalItems: updatedFeed?.items.length || 0 });
    return NextResponse.json({ feed: updatedFeed });
  } catch (error) {
    logger.logApiRequestError('POST', `/api/feeds/${id}/refresh`, error as Error, userId, Date.now() - startTime);

    if (error instanceof Error) {
      if (error.message.includes('connect') || error.message.includes('ETIMEDOUT')) {
        return NextResponse.json(
          { error: "数据库连接失败，请稍后重试" },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { error: "刷新 RSS 源失败：" + (error instanceof Error ? error.message : "未知错误") },
      { status: 500 }
    );
  }
}