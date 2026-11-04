import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  walConfigured: boolean | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// SQLite High-Concurrency Configuration (BUG-HUNTER-07)
// Enable Write-Ahead Logging (WAL) and set busy_timeout to prevent SQLITE_BUSY locks
if (!globalForPrisma.walConfigured) {
  globalForPrisma.walConfigured = true;
  prisma.$queryRawUnsafe("PRAGMA journal_mode = WAL;")
    .then(() => prisma.$queryRawUnsafe("PRAGMA synchronous = NORMAL;"))
    .then(() => prisma.$queryRawUnsafe("PRAGMA busy_timeout = 5000;"))
    .catch((err) => {
      // Non-fatal warning during build/static export
      if (process.env.NODE_ENV !== "production") {
        console.warn("Prisma SQLite PRAGMA configuration warning:", err?.message || err);
      }
    });
}
