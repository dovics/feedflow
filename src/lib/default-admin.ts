import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

const DEFAULT_ADMIN_EMAIL = "admin@feedflow.local";
let initialized = false;

export async function initializeDefaultAdmin() {
  if (initialized) {
    console.log("[Default Admin] Already initialized");
    return;
  }

  try {
    const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD;

    if (!defaultAdminPassword) {
      console.error("[Default Admin] ERROR: DEFAULT_ADMIN_PASSWORD environment variable is not set!");
      console.error("[Default Admin] Please set DEFAULT_ADMIN_PASSWORD in your environment variables.");
      console.error("[Default Admin] Application cannot start without default admin user.");
      throw new Error("DEFAULT_ADMIN_PASSWORD environment variable is required");
    }

    const existingAdmin = await prisma.user.findUnique({
      where: { email: DEFAULT_ADMIN_EMAIL }
    });

    if (existingAdmin) {
      console.log(`[Default Admin] Default admin user already exists: ${DEFAULT_ADMIN_EMAIL}`);
      initialized = true;
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
    initialized = true;
  } catch (error) {
    console.error("[Default Admin] Initialization error:", error);
    throw error;
  }
}

export async function getDefaultAdminStatus() {
  return initialized;
}
