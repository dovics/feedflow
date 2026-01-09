import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const feedId = searchParams.get("feedId");
    const tag = searchParams.get("tag");
    const readStatus = searchParams.get("read");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const skip = (page - 1) * limit;

    // 获取订阅源信息以应用过滤器
    const feeds = await prisma.feed.findMany({
      where: {
        userId: session.user.id,
        ...(feedId && { id: feedId }),
        ...(tag && { tags: { has: tag } })
      },
      select: {
        id: true,
        titleFilter: true
      }
    });

    // 获取所有匹配订阅源的 ID
    const feedIds = feeds.map(f => f.id);

    // 创建过滤器映射
    const filterMap = new Map<string, RegExp | null>();
    feeds.forEach(feed => {
      if (feed.titleFilter) {
        try {
          filterMap.set(feed.id, new RegExp(feed.titleFilter, 'i'));
        } catch (error) {
          console.error("Invalid regex filter for feed:", feed.id, error);
          filterMap.set(feed.id, null);
        }
      } else {
        filterMap.set(feed.id, null);
      }
    });

    const items = await prisma.item.findMany({
      where: {
        feedId: { in: feedIds },
        ...(readStatus !== null && {
          read: readStatus === "true"
        })
      },
      include: {
        feed: true
      },
      orderBy: {
        pubDate: "desc"
      },
      take: limit * 2, // 获取更多项目以补偿过滤
      skip: skip
    });

    // 应用标题过滤器
    const filteredItems = items.filter(item => {
      const filter = filterMap.get(item.feedId);
      if (!filter) return true; // 没有过滤器，显示所有项目
    
      return !filter.test(item.title); // 匹配过滤器的项目将被排除
    }).slice(0, limit); // 确保返回正确的数量

    return NextResponse.json({ items: filteredItems });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch items" },
      { status: 400 }
    );
  }
}