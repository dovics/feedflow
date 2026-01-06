import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const feeds = await prisma.feed.findMany({
      include: {
        _count: {
          select: { items: true }
        },
        user: {
          select: {
            email: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    const feedsWithCounts = feeds.map(feed => ({
      id: feed.id,
      url: feed.url,
      title: feed.title,
      itemCount: feed._count.items,
      userEmail: feed.user.email,
      userName: feed.user.name,
      createdAt: feed.createdAt,
      updatedAt: feed.updatedAt
    }));

    return NextResponse.json({ feeds: feedsWithCounts });
  } catch (error) {
    console.error("Failed to fetch feeds:", error);
    return NextResponse.json(
      { error: "Failed to fetch feeds" },
      { status: 500 }
    );
  }
}
