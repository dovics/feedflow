import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateConfigSchema = z.object({
  value: z.string()
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

    if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { value } = updateConfigSchema.parse(body);

    const updatedConfig = await prisma.systemConfig.upsert({
      where: { key: id },
      update: { value, updatedAt: new Date() },
      create: {
        key: id,
        value,
        description: getDescriptionForKey(id)
      }
    });

    return NextResponse.json({ config: updatedConfig });
  } catch (error) {
    console.error("Config update error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "无效的配置值" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "更新配置失败：" + (error instanceof Error ? error.message : "未知错误") },
      { status: 500 }
    );
  }
}

function getDescriptionForKey(key: string): string | null {
  const descriptions: Record<string, string> = {
    "REGISTRATION_ENABLED": "是否允许新用户注册",
    "OPENAI_BASE_URL": "OpenAI API 基础 URL",
    "OPENAI_API_KEY": "OpenAI API 密钥",
    "OPENAI_MODEL": "用于 RSS 分类的大模型名称"
  };
  return descriptions[key] || null;
}