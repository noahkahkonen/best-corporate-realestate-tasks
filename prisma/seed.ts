import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.project.count();
  if (existing > 0) {
    console.log("Database already seeded; skipping.");
    return;
  }

  await prisma.project.create({
    data: {
      name: "General",
      color: "#4f46e5",
      tasks: {
        create: [
          {
            title: "Welcome — add your first real task",
            notes: "Delete this sample when you are ready.",
            status: "TODO",
            priority: "MEDIUM",
          },
        ],
      },
    },
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
