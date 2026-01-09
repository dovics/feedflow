import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateFeedSchema = z.object({
  tags: z.array(z.string().min(1).max(50)).optional(),
  defaultReadStatus: z.boolean().optional(),
  titleFilter: z.string().optional()
});

export async function PATCH(
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
    const { tags, defaultReadStatus, titleFilter } = updateFeedSchema.parse(body);

    const updateData: { tags?: string[]; defaultReadStatus?: boolean; titleFilter?: string | null } = {};
    if (tags !== undefined) {
      updateData.tags = tags;
    }
    if (defaultReadStatus !== undefined) {
      updateData.defaultReadStatus = defaultReadStatus;
    }
    if (titleFilter !== undefined) {
      updateData.titleFilter = titleFilter || null;
    }

    const updatedFeed = await prisma.feed.update({
      where: { id: feedId },
      data: updateData
    });

    return NextResponse.json({ feed: updatedFeed });
  } catch (error) {
    console.error("Feed update error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "无效的输入数据" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "更新失败：" + (error instanceof Error ? error.message : "未知错误") },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    await prisma.feed.delete({
      where: { id: feedId }
    });

    return NextResponse.json({ message: "Feed deleted successfully" });
  } catch (error) {
    console.error("Feed delete error:", error);
    return NextResponse.json(
      { error: "删除失败：" + (error instanceof Error ? error.message : "未知错误") },
      { status: 500 }
    );
  }
}
