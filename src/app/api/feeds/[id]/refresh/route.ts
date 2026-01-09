import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Parser from "rss-parser";

const parser = new Parser({
  timeout: 15000,
  maxRedirects: 5
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const feed = await prisma.feed.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!feed || feed.userId !== session.user.id) {
      return NextResponse.json({ error: "Feed not found" }, { status: 404 });
    }

    let parsedFeed;
    try {
      parsedFeed = await parser.parseURL(feed.url);
    } catch (parseError) {
      console.error("RSS parse error during refresh:", parseError);

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
              continue;
            }
          } catch (error) {
            console.error("Invalid regex filter:", error);
            // 如果正则表达式无效，继续添加项目
          }
        }

        await prisma.item.create({
          data: {
            title: item.title,
            link: item.link,
            description: item.contentSnippet || item.content || item.description,
            pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
            feedId: id
          }
        });
      }
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

    return NextResponse.json({ feed: updatedFeed });
  } catch (error) {
    console.error("Feed refresh error:", error);

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