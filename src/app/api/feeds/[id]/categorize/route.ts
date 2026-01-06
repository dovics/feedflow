import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { categorizeFeedById } from "@/lib/openai-categorizer";
import { z } from "zod";

const categorizeSchema = z.object({
  feedId: z.string()
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { feedId } = categorizeSchema.parse(body);

    const feed = await prisma.feed.findUnique({
      where: { id: feedId }
    });

    if (!feed) {
      return NextResponse.json({ error: "Feed not found" }, { status: 404 });
    }

    if (feed.userId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const category = await categorizeFeedById(feedId);

    if (!category) {
      return NextResponse.json(
        { error: "Failed to categorize feed. Please check OpenAI configuration." },
        { status: 500 }
      );
    }

    const updatedFeed = await prisma.feed.findUnique({
      where: { id: feedId }
    });

    return NextResponse.json({ feed: updatedFeed });
  } catch (error) {
    console.error("Feed categorization error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request format" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to categorize feed" },
      { status: 500 }
    );
  }
}
