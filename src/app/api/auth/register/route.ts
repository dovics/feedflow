import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional()
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, name } = registerSchema.parse(body);

    // 检查是否允许注册
    const registrationEnabled = await prisma.systemConfig.findUnique({
      where: { key: "REGISTRATION_ENABLED" }
    });

    if (registrationEnabled?.value === "false") {
      return NextResponse.json(
        { error: "用户注册已禁用" },
        { status: 403 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      );
    }

    // 统计用户数量
    const userCount = await prisma.user.count();

    // 第一个用户自动成为管理员
    const role = userCount === 0 ? "ADMIN" : "USER";

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || email.split("@")[0],
        role
      }
    });

    // 如果是第一个用户，初始化系统配置
    if (userCount === 0) {
      await prisma.systemConfig.createMany({
        data: [
          {
            key: "REGISTRATION_ENABLED",
            value: "true",
            description: "是否允许新用户注册"
          },
          {
            key: "OPENAI_BASE_URL",
            value: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
            description: "OpenAI API 基础 URL"
          },
          {
            key: "OPENAI_API_KEY",
            value: "",
            description: "OpenAI API 密钥"
          },
          {
            key: "OPENAI_MODEL",
            value: process.env.OPENAI_MODEL || "gpt-4o-mini",
            description: "用于 RSS 分类的大模型名称"
          }
        ],
        skipDuplicates: true
      });
    }

    return NextResponse.json(
      { user: { id: user.id, email: user.email, name: user.name, role } },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}