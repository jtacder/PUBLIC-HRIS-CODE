import bcrypt from "bcrypt";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { logger } from "./utils/logger";

const SUPERADMIN_EMAIL = "admin@hris.local";
const DEFAULT_PASSWORD = process.env.SUPERADMIN_PASSWORD || "Admin123!@#";

export async function seedSuperadmin() {
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, SUPERADMIN_EMAIL));

  if (existing) {
    logger.info("Superadmin account already exists");
    return existing;
  }

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);

  const [superadmin] = await db
    .insert(users)
    .values({
      email: SUPERADMIN_EMAIL,
      passwordHash,
      role: "ADMIN",
      isSuperadmin: true,
      isActive: true,
    })
    .returning();

  logger.info("Superadmin account created", { email: SUPERADMIN_EMAIL });
  return superadmin;
}

// Allow direct execution
if (process.argv[1]?.includes("seed-superadmin")) {
  seedSuperadmin()
    .then(() => {
      console.log(`Superadmin seeded: ${SUPERADMIN_EMAIL}`);
      process.exit(0);
    })
    .catch((err) => {
      console.error("Failed to seed superadmin:", err);
      process.exit(1);
    });
}
