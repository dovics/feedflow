import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const settingsSchema = z.object({
  fontSize: z.number().min(12).max(32),
  lineHeight: z.number().min(1.2).max(2.5),
  fontFamily: z.string(),
  fontFamilyName: z.string(),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  textColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/)
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { readingSettings: true }
    });

    return NextResponse.json({
      settings: user?.readingSettings || null
    });
  } catch (error) {
    console.error("Failed to fetch reading settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch reading settings" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const settings = settingsSchema.parse(body);

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        readingSettings: settings as any
      }
    });

    return NextResponse.json({
      settings: user.readingSettings
    });
  } catch (error) {
    console.error("Failed to save reading settings:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid settings format" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to save reading settings" },
      { status: 500 }
    );
  }
}
