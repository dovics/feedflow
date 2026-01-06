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

    const items = await prisma.item.findMany({
      where: {
        feed: {
          userId: session.user.id,
          ...(feedId && { id: feedId }),
          ...(tag && { tags: { has: tag } })
        },
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
      take: 50
    });

    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch items" },
      { status: 400 }
    );
  }
}