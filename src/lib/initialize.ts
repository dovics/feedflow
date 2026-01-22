import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

const DEFAULT_ADMIN_EMAIL = "admin@feedwise.local";
const globalForInit = globalThis as unknown as {
  isInitializing: boolean;
  initializationPromise: Promise<void> | undefined;
};

interface SystemConfigItem {
  key: string;
  value: string;
  description: string;
}

const DEFAULT_SYSTEM_CONFIGS: SystemConfigItem[] = [
  {
    key: "OPENAI_BASE_URL",
    value: process.env.OPENAI_BASE_URL || "",
    description: "OpenAI API 基础 URL"
  },
  {
    key: "OPENAI_API_KEY",
    value: process.env.OPENAI_API_KEY || "",
    description: "OpenAI API 密钥"
  },
  {
    key: "OPENAI_MODEL",
    value: process.env.OPENAI_MODEL || "",
    description: "OpenAI 模型名称"
  },
  {
    key: "max_items_per_feed",
    value: process.env.MAX_ITEMS_PER_FEED || "100",
    description: "每个订阅源保留的最大文章数量"
  }
];

async function initializeSystemConfigs() {
  console.log("[System Config] Initializing system configurations...");

  for (const config of DEFAULT_SYSTEM_CONFIGS) {
    try {
      const existing = await prisma.systemConfig.findUnique({
        where: { key: config.key }
      });

      if (!existing) {
        try {
          await prisma.systemConfig.create({
            data: config
          });
          console.log(`[System Config] Created config: ${config.key}`);
        } catch (error) {
          const prismaError = error as { code?: string };
          if (prismaError.code !== 'P2002') {
            throw error;
          }
          console.log(`[System Config] Config already exists (race condition): ${config.key}`);
        }
      } else {
        console.log(`[System Config] Config already exists: ${config.key}`);
      }
    } catch (error) {
      console.error(`[System Config] Error processing config ${config.key}:`, error);
      throw error;
    }
  }

  console.log("[System Config] System configurations initialized");
}

async function initializeDefaultAdmin() {
  console.log("[Default Admin] Initializing default admin user...");

  const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD;

  if (!defaultAdminPassword) {
    console.error("[Default Admin] ERROR: DEFAULT_ADMIN_PASSWORD environment variable is not set!");
    console.error("[Default Admin] Please set DEFAULT_ADMIN_PASSWORD in your environment variables.");
    console.error("[Default Admin] Application cannot start without default admin user.");
    throw new Error("DEFAULT_ADMIN_PASSWORD environment variable is required");
  }

  try {
    const existingAdmin = await prisma.user.findUnique({
      where: { email: DEFAULT_ADMIN_EMAIL }
    });

    if (existingAdmin) {
      console.log(`[Default Admin] Default admin user already exists: ${DEFAULT_ADMIN_EMAIL}`);
      return;
    }

    console.log(`[Default Admin] Creating default admin user: ${DEFAULT_ADMIN_EMAIL}`);

    const hashedPassword = await bcrypt.hash(defaultAdminPassword, 10);

    const defaultAdmin = await prisma.user.create({
      data: {
        email: DEFAULT_ADMIN_EMAIL,
        password: hashedPassword,
        name: "Default Admin",
        role: "SUPER_ADMIN"
      }
    });

    console.log(`[Default Admin] Default admin user created successfully (ID: ${defaultAdmin.id})`);
  } catch (error) {
    const prismaError = error as { code?: string };
    if (prismaError.code === 'P2002') {
      console.log(`[Default Admin] Default admin user already exists (race condition): ${DEFAULT_ADMIN_EMAIL}`);
      return;
    }
    throw error;
  }
}

export async function initializeApplication() {
  if (!globalForInit.isInitializing && globalForInit.initializationPromise) {
    return globalForInit.initializationPromise;
  }

  if (globalForInit.isInitializing) {
    while (globalForInit.isInitializing) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    return globalForInit.initializationPromise;
  }

  globalForInit.isInitializing = true;

  globalForInit.initializationPromise = (async () => {
    try {
      console.log("[Initialization] Starting application initialization...");

      await initializeSystemConfigs();
      await initializeDefaultAdmin();

      console.log("[Initialization] Application initialized successfully");
    } catch (error) {
      console.error("[Initialization] Initialization error:", error);
      throw error;
    } finally {
      globalForInit.isInitializing = false;
    }
  })();

  return globalForInit.initializationPromise;
}

export function isInitialized() {
  return !!globalForInit.initializationPromise;
}
