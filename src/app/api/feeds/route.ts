import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Parser from "rss-parser";
import { z } from "zod";
import { categorizeFeed } from "@/lib/openai-categorizer";

const parser = new Parser({
  timeout: 15000,
  maxRedirects: 5,
  customFields: {
    item: []
  }
});

const feedSchema = z.object({
  url: z.string().url(),
  titleFilter: z.string().optional()
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { url, titleFilter } = feedSchema.parse(body);

    const existingFeed = await prisma.feed.findFirst({
      where: {
        url,
        userId: session.user.id
      }
    });

    if (existingFeed) {
      return NextResponse.json(
        { error: "Feed already subscribed" },
        { status: 400 }
      );
    }

    let feed;
    try {
      feed = await parser.parseURL(url);
    } catch (parseError) {
      console.error("RSS parse error:", parseError);

      if (parseError instanceof Error) {
        if (parseError.message.includes('ETIMEDOUT') || parseError.message.includes('timeout')) {
          return NextResponse.json(
            { error: "连接超时：无法访问 RSS 源，请检查网络连接或稍后重试" },
            { status: 408 }
          );
        }
        if (parseError.message.includes('ENOTFOUND') || parseError.message.includes('getaddrinfo')) {
          return NextResponse.json(
            { error: "域名解析失败：无效的 URL 或网络不可达" },
            { status: 400 }
          );
        }
        if (parseError.message.includes('ECONNREFUSED')) {
          return NextResponse.json(
            { error: "连接被拒绝：目标服务器拒绝连接" },
            { status: 400 }
          );
        }
        if (parseError.message.includes('Invalid XML') || parseError.message.includes('parser')) {
          return NextResponse.json(
            { error: "RSS 格式错误：该 URL 不是有效的 RSS/Atom 源" },
            { status: 400 }
          );
        }
      }

      return NextResponse.json(
        { error: "无法解析 RSS 源：请检查 URL 是否正确" },
        { status: 400 }
      );
    }

    const feedItems = feed.items.map((item) => ({
      title: item.title || "Untitled",
      link: item.link,
      description: item.contentSnippet || item.content || item.description,
      pubDate: item.pubDate ? new Date(item.pubDate) : new Date()
    }));

    // 如果设置了标题过滤器，使用正则表达式过滤
    let filteredItems = feedItems;
    if (titleFilter) {
      try {
        const regex = new RegExp(titleFilter, 'i');
        filteredItems = feedItems.filter(item => !regex.test(item.title));
      } catch (error) {
        console.error("Invalid regex filter:", error);
        // 如果正则表达式无效，不过滤任何项目
      }
    }

    const newFeed = await prisma.feed.create({
      data: {
        url,
        title: feed.title || url,
        tags: [],
        titleFilter: titleFilter || null,
        userId: session.user.id,
        items: {
          create: filteredItems
        }
      },
      include: {
        items: true
      }
    });

    categorizeFeed({
      url: newFeed.url,
      title: newFeed.title || undefined,
      description: feed.description || undefined,
      items: feedItems.slice(0, 5).map(item => ({
        title: item.title || undefined,
        description: item.description || undefined
      }))
    }).then(async (tags) => {
      if (tags) {
        await prisma.feed.update({
          where: { id: newFeed.id },
          data: { tags }
        });
      }
    }).catch((error) => {
      console.error("Failed to auto-categorize feed:", error);
    });

    return NextResponse.json({ feed: newFeed }, { status: 201 });
  } catch (error) {
    console.error("Feed creation error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "无效的 URL 格式：请输入完整的 RSS 地址（如：https://example.com/rss.xml）" },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      if (error.message.includes('unique constraint')) {
        return NextResponse.json(
          { error: "该 RSS 源已存在" },
          { status: 409 }
        );
      }
      if (error.message.includes('connect') || error.message.includes('ETIMEDOUT')) {
        return NextResponse.json(
          { error: "数据库连接失败，请稍后重试" },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { error: "添加 RSS 源失败：" + (error instanceof Error ? error.message : "未知错误") },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const feeds = await prisma.feed.findMany({
      where: {
        userId: session.user.id
      },
      include: {
        _count: {
          select: {
            items: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return NextResponse.json({ feeds });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch feeds" },
      { status: 400 }
    );
  }
}