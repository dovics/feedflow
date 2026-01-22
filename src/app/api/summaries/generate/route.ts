import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateDailySummary, createDailySummary, getTodaySummary, getUserSummaryLanguage } from "@/lib/summary-generator";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let userId: string | undefined;

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      logger.logApiRequestError('POST', '/api/summaries/generate', new Error('Unauthorized'), undefined, Date.now() - startTime);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    userId = session.user.id;
    logger.logApiRequestStart('POST', '/api/summaries/generate', userId);

    // Check if summary already exists for today
    const existingSummary = await getTodaySummary(session.user.id);
    if (existingSummary) {
      logger.info('Summary already exists for today', { userId, summaryId: existingSummary.id });
      return NextResponse.json({ summary: existingSummary });
    }

    // Get user's summary language preference
    const language = await getUserSummaryLanguage(session.user.id);
    logger.info('Generating daily summary', { userId, language });

    // Calculate 24 hours ago
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Check if there are any unread items in the last 24 hours
    const itemCount = await prisma.item.count({
      where: {
        read: false,
        pubDate: {
          gte: twentyFourHoursAgo
        },
        feed: {
          userId: session.user.id
        }
      }
    });

    if (itemCount === 0) {
      // No unread items, return null
      logger.info('No unread items in last 24 hours', { userId });
      return NextResponse.json({ summary: null });
    }

    logger.info('Found unread items for summary', { userId, itemCount });

    // Generate summary
    const result = await generateDailySummary(session.user.id, language);

    if (!result.success || !result.content) {
      // Failed to generate, return null (don't show error to user on auto-check)
      logger.warn('Failed to generate daily summary', { userId, error: result.error });
      return NextResponse.json({ summary: null, error: result.error });
    }

    // Save to database with actual item count and article map
    const summary = await createDailySummary(session.user.id, result.content, language, result.itemCount || itemCount, result.articleMap);

    logger.logApiRequestSuccess('POST', '/api/summaries/generate', userId, Date.now() - startTime, { summaryId: summary.id, itemCount: summary.itemCount });
    return NextResponse.json({ summary });
  } catch (error) {
    logger.logApiRequestError('POST', '/api/summaries/generate', error as Error, userId, Date.now() - startTime);
    // Return null on error (don't block user login)
    return NextResponse.json({ summary: null });
  }
}
