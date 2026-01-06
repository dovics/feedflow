import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const addTagsSchema = z.object({
  action: z.enum(["add", "remove"]),
  tags: z.array(z.string().min(1).max(50))
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

    const { id: feedId } = await params;

    const existingFeed = await prisma.feed.findUnique({
      where: { id: feedId }
    });

    if (!existingFeed) {
      return NextResponse.json({ error: "Feed not found" }, { status: 404 });
    }

    if (existingFeed.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { action, tags } = addTagsSchema.parse(body);

    let updatedTags: string[];

    if (action === "add") {
      const currentTags = existingFeed.tags || [];
      const newTagsSet = new Set(currentTags);

      tags.forEach(tag => newTagsSet.add(tag));

      updatedTags = Array.from(newTagsSet);
    } else {
      const tagsToRemoveSet = new Set(tags);
      updatedTags = (existingFeed.tags || []).filter(tag => !tagsToRemoveSet.has(tag));
    }

    const updatedFeed = await prisma.feed.update({
      where: { id: feedId },
      data: { tags: updatedTags }
    });

    return NextResponse.json({ feed: updatedFeed });
  } catch (error) {
    console.error("Feed tags update error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "无效的输入数据" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "更新标签失败：" + (error instanceof Error ? error.message : "未知错误") },
      { status: 500 }
    );
  }
}
