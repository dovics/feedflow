import { PrismaClient } from "@/generated/prisma/client";
import { initializeApplication } from "./initialize";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Only initialize at runtime, not during build
// Skip initialization if SKIP_DB_INIT is set (used during Docker build)
if (process.env.SKIP_DB_INIT !== "true") {
  initializeApplication().catch((error) => {
    console.error("[Prisma] Failed to initialize application:", error);
    // Don't exit during build
    if (process.env.NODE_ENV === "production" && !process.env.CI) {
      process.exit(1);
    }
  });
}
