import { PrismaClient } from "@prisma/client";

/**
 * Dev HMR can keep a stale PrismaClient on `globalThis` from before
 * `prisma generate`, which then rejects new relations (e.g. helpMessages).
 * Bump `PRISMA_CLIENT_VERSION` after schema changes that add models/relations.
 */
const PRISMA_CLIENT_VERSION = 2;

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
  prismaClientVersion?: number;
};

function getClient(): PrismaClient {
  const stale =
    globalForPrisma.prisma != null &&
    globalForPrisma.prismaClientVersion !== PRISMA_CLIENT_VERSION;

  if (stale) {
    void globalForPrisma.prisma?.$disconnect();
    globalForPrisma.prisma = undefined;
  }

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient();
    globalForPrisma.prismaClientVersion = PRISMA_CLIENT_VERSION;
  }

  return globalForPrisma.prisma;
}

export const prisma = getClient();
