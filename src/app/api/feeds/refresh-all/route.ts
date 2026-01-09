import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Parser from "rss-parser";

const parser = new Parser({
  timeout: 15000,
  maxRedirects: 5
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 获取用户的所有订阅源
    const feeds = await prisma.feed.findMany({
      where: { userId: session.user.id }
    });

    if (feeds.length === 0) {
      return NextResponse.json({ message: "No feeds to refresh", feeds: [] });
    }

    const refreshPromises = feeds.map(async (feed) => {
      try {
        const parsedFeed = await parser.parseURL(feed.url);

        for (const item of parsedFeed.items) {
          const existingItem = await prisma.item.findFirst({
            where: {
              feedId: feed.id,
              link: item.link
            }
          });

          if (!existingItem && item.title) {
            await prisma.item.create({
              data: {
                title: item.title,
                link: item.link,
                description: item.contentSnippet || item.content || item.description,
                pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
                feedId: feed.id
              }
            });
          }
        }

        return { id: feed.id, success: true };
      } catch (error) {
        console.error(`Failed to refresh feed ${feed.id}:`, error);
        return { id: feed.id, success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    const results = await Promise.allSettled(refreshPromises);

    const refreshedCount = results.filter(r =>
      r.status === 'fulfilled' && r.value.success
    ).length;

    return NextResponse.json({
      message: `Refreshed ${refreshedCount}/${feeds.length} feeds`,
      feeds,
      refreshedCount
    });

  } catch (error) {
    console.error("Batch refresh error:", error);
    return NextResponse.json(
      { error: "Failed to refresh feeds" },
      { status: 500 }
    );
  }
}
