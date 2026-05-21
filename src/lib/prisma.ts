import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrisma> | undefined;
};

function createPrisma() {
  const client = new PrismaClient();

  return client.$extends({
    query: {
      $allOperations: async ({ args, query }) => {
        const maxRetries = 3;
        const delay = (ms: number) =>
          new Promise((resolve) => setTimeout(resolve, ms));

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            return await query(args);
          } catch (err: unknown) {
            const isConnError =
              err instanceof Error &&
              (err.message.includes("Can't reach database") ||
                err.message.includes("Connection refused") ||
                err.message.includes("ECONNREFUSED") ||
                err.message.includes("ETIMEDOUT") ||
                err.message.includes("Connection reset"));

            if (isConnError && attempt < maxRetries) {
              await delay(attempt * 500);
              continue;
            }
            throw err;
          }
        }
      },
    },
  });
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
